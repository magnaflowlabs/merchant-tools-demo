import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMerchantStore } from './merchant-store';
import { useWalletStore } from './wallet-store';
import { Wallet } from 'ethers';

import { useAuthStore } from './auth-store';
import { generateMultipleTronAddresses } from '@/utils/bip32-utils';
import { uploadAddresses } from '@/services/ws/api';
const SYNC_CHECK_INTERVAL = 3000;
const MAX_ADDRESS_BATCH_SIZE = 400;

interface SyncConfigState {
  minSubAccountThreshold: string;
  autoGenerateAddressCount: string;
  isSyncingAddress: boolean;
  isExecutingSync: boolean;

  setMinSubAccountThreshold: (value: string) => void;
  setAutoGenerateAddressCount: (value: string) => void;
  setIsSyncingAddress: (value: boolean) => void;

  resetToDefaults: () => void;

  executeSyncOperation: () => Promise<void>;
  startSyncTimer: () => void;
  stopSyncTimer: () => void;

  generateAndUploadAddressesInBatches: (totalNeeded: number, startIndex: number) => Promise<void>;
}

let syncTimer: NodeJS.Timeout | null = null;

export const useSyncConfigStore = create<SyncConfigState>()(
  persist(
    (set, get) => ({
      // state data - initial value will be loaded from cache in persist middleware
      minSubAccountThreshold: '200',
      autoGenerateAddressCount: '500',
      isSyncingAddress: false,
      isExecutingSync: false,

      // set minimum sub account threshold
      setMinSubAccountThreshold: (value: string) => {
        set({ minSubAccountThreshold: value });
      },

      // set auto generate address count
      setAutoGenerateAddressCount: (value: string) => {
        set({ autoGenerateAddressCount: value });
      },

      // set sync address status
      setIsSyncingAddress: (value: boolean) => {
        set({ isSyncingAddress: value });

        if (value) {
          get().startSyncTimer();
        } else {
          get().stopSyncTimer();
        }
      },

      // reset to default value
      resetToDefaults: () => {
        set({
          isSyncingAddress: false,
          isExecutingSync: false,
        });
        // stop timer when reset
        get().stopSyncTimer();
      },

      // start sync timer
      startSyncTimer: async () => {
        const state = get();
        // clear possible existing old timer
        state.stopSyncTimer();

        // execute once immediately
        await state.executeSyncOperation();

        // set timer, periodically execute sync operation
        syncTimer = setInterval(async () => {
          const state = get();
          // check sync status first
          if (!state.isSyncingAddress) {
            state.stopSyncTimer();
            return;
          }
          // check if sync operation is already in progress
          if (state.isExecutingSync) {
            return;
          }
          try {
            await state.executeSyncOperation();
          } catch (error) {
            console.error('Sync operation failed in timer:', error);
            // Don't stop the timer on error, let it continue trying
          }
        }, SYNC_CHECK_INTERVAL);
      },

      // stop sync timer
      stopSyncTimer: () => {
        if (syncTimer) {
          clearInterval(syncTimer);
          syncTimer = null;
        }
      },

      // batch generate and upload addresses
      generateAndUploadAddressesInBatches: async (totalNeeded: number, startIndex: number) => {
        let currentIndex = startIndex;
        let remainingCount = totalNeeded;
        const { cur_chain } = useAuthStore.getState();
        while (remainingCount > 0) {
          // cancellation check: stop immediately if syncing has been turned off
          const state = get();
          if (!state.isSyncingAddress) {
            break;
          }
          // calculate current batch size
          const batchSize = Math.min(remainingCount, MAX_ADDRESS_BATCH_SIZE);

          try {
            const newAddresses = await generateMultipleTronAddresses(currentIndex, batchSize);
            // prepare upload data
            const createAddress = newAddresses.map((key) => ({
              path: key.path || '',
              address: key.address || '',
            }));

            const uploadResult = await uploadAddresses({
              chain: cur_chain.chain,
              addresses: createAddress,
            });

            // update merchant store with latest address usage data (but not too frequently)
            if (uploadResult?.data) {
              const merchantStore = useMerchantStore.getState();
              merchantStore.updateAddressUsage(uploadResult.data);
            }

            // update index and remaining count
            currentIndex += batchSize;
            remainingCount -= batchSize;

            // // if there is remaining, add small delay to prevent UI blocking
            // if (remainingCount > 0) {
            //   // cancellation check before proceeding to next batch
            //   if (!get().isSyncingAddress) {
            //
            //     );
            //     break;
            //   }
            //
            //   // Add small delay to prevent UI blocking, but keep it minimal
            //   await new Promise((resolve) => setTimeout(resolve, 50));
            // }
          } catch (error) {
            console.error(error);
            throw error;
          }
        }

        // Upload task completed successfully
      },

      // execute sync operation function - pure logic, not including timer
      executeSyncOperation: async () => {
        // get address usage in merchant store
        const merchantStore = useMerchantStore.getState();

        const state = get();

        // check sync status
        if (!state.isSyncingAddress) {
          return;
        }

        // check execution status lock, prevent concurrent execution
        if (state.isExecutingSync) {
          return;
        }
        // set execution status lock
        set({ isExecutingSync: true });
        try {
          const { available = 0 } = merchantStore?.addressUsage || {};
          const autoGenerateAddressCount = parseInt(state.autoGenerateAddressCount) || 0;
          const minSubAccountThreshold = parseInt(state.minSubAccountThreshold) || 0;

          // check if current unused address count is less than minimum sub account threshold
          if (Number(available) < Number(minSubAccountThreshold)) {
            // get latest address usage to determine start index
            // await merchantStore.queryAddressUsage();
            // calculate needed address count
            const neededAddressCount = Number(autoGenerateAddressCount);

            // get wallet information
            const walletStore = useWalletStore.getState();
            const keystoreData = walletStore.keystoreData || '';
            const password = walletStore.walletPassword || '';

            if (!keystoreData || !password || !walletStore.keystore_id) {
              console.error('Wallet information is incomplete, cannot generate addresses');
              return;
            }

            // decrypt wallet to get mnemonic
            const wallet = await Wallet.fromEncryptedJson(keystoreData, password);
            // let mnemonic = '';

            if (wallet && 'mnemonic' in wallet && wallet.mnemonic) {
              // mnemonic = wallet.mnemonic.phrase || '';
            } else {
              console.error('Wallet does not have mnemonic information');
              return;
            }
            const { last_path } = merchantStore.addressUsage || {};
            let Newlast_path = last_path;
            if (!Newlast_path) {
              Newlast_path = "m/44'/195'/0'/0/0";
            }

            const pathIndex = Newlast_path?.match(/(\d+)'?$/);
            let currentStartIndex = parseInt(pathIndex?.[1] || '0') + 1;
            // batch generate and upload addresses
            await get().generateAndUploadAddressesInBatches(neededAddressCount, currentStartIndex);
          }
        } catch (error) {
          console.error('Sync operation failed:', error);
        } finally {
          set({ isExecutingSync: false });
        }
      },
    }),
    {
      name: 'sync-config-storage',
      partialize: (state) => ({
        minSubAccountThreshold: state.minSubAccountThreshold,
        autoGenerateAddressCount: state.autoGenerateAddressCount,
      }),
    }
  )
);
