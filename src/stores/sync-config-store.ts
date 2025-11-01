import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMerchantStore } from './merchant-store';
import { useWalletStore } from './wallet-store';
import BigNumber from 'bignumber.js';
import { toast } from 'sonner';
import { generateMultipleTronAddresses } from '@/utils/bip32-utils';
import { uploadAddresses } from '@/services/ws/api';
import { useChainConfigStore } from './chain-config-store';
const SYNC_CHECK_INTERVAL = 3000;
const MAX_ADDRESS_BATCH_SIZE = 400;

interface SyncConfigState {
  minSubAccountThreshold: string;
  autoGenerateAddressCount: string;
  isSyncingAddress: boolean;
  isExecutingSync: boolean;

  // Progress tracking
  syncProgress: {
    current: number;
    total: number;
    stage: 'generating' | 'uploading' | 'idle';
  };

  setMinSubAccountThreshold: (value: string) => void;
  setAutoGenerateAddressCount: (value: string) => void;
  setIsSyncingAddress: (value: boolean) => void;
  setSyncProgress: (progress: {
    current: number;
    total: number;
    stage: 'generating' | 'uploading' | 'idle';
  }) => void;

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
      minSubAccountThreshold: '5000',
      autoGenerateAddressCount: '5000',
      isSyncingAddress: false,
      isExecutingSync: false,

      // Initialize progress tracking
      syncProgress: {
        current: 0,
        total: 0,
        stage: 'idle' as const,
      },

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
          // Reset progress when stopping sync
          set({ syncProgress: { current: 0, total: 0, stage: 'idle' } });
        }
      },

      // set sync progress
      setSyncProgress: (progress) => {
        set({ syncProgress: progress });
      },

      // reset to default value
      resetToDefaults: () => {
        set({
          isSyncingAddress: false,
          isExecutingSync: false,
          syncProgress: { current: 0, total: 0, stage: 'idle' },
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

      // batch generate and upload addresses with progress tracking
      generateAndUploadAddressesInBatches: async (totalNeeded: number, startIndex: number) => {
        let currentIndex = startIndex;
        let remainingCount = totalNeeded;
        let totalProcessed = 0;
        const curChainConfig = useChainConfigStore.getState().curChainConfig;

        // Initialize progress tracking
        get().setSyncProgress({ current: 0, total: totalNeeded, stage: 'generating' });

        while (remainingCount > 0) {
          const state = get();
          if (!state.isSyncingAddress) {
            break;
          }

          const batchSize = Math.min(remainingCount, MAX_ADDRESS_BATCH_SIZE);

          try {
            // Update progress for generation stage
            get().setSyncProgress({
              current: totalProcessed,
              total: totalNeeded,
              stage: 'generating',
            });

            // Generate addresses with progress callback
            const newAddresses = await generateMultipleTronAddresses(
              currentIndex,
              batchSize,
              (current) => {
                // Update fine-grained progress during generation
                const globalProgress = totalProcessed + current;
                get().setSyncProgress({
                  current: globalProgress,
                  total: totalNeeded,
                  stage: 'generating',
                });
              }
            );

            const createAddress = (
              newAddresses as Array<{ address: string; privateKey: string; path: string }>
            ).map((key) => ({
              path: key.path || '',
              address: key.address || '',
            }));

            // Update progress for upload stage
            totalProcessed += batchSize;
            get().setSyncProgress({
              current: totalProcessed,
              total: totalNeeded,
              stage: 'uploading',
            });

            const uploadResult = await uploadAddresses({
              chain: curChainConfig.chain,
              addresses: createAddress,
            });

            if (uploadResult?.data && uploadResult?.success) {
              const merchantStore = useMerchantStore.getState();

              merchantStore.updateAddressUsage(uploadResult.data);
            } else {
              get().setIsSyncingAddress(false);
              toast.error('Upload addresses failed, please try again later');
              return;
            }

            // update index and remaining count
            currentIndex += batchSize;
            remainingCount -= batchSize;

            // Update progress after successful upload
            get().setSyncProgress({
              current: totalProcessed,
              total: totalNeeded,
              stage: 'generating',
            });
          } catch (error) {
            console.error(error);
            get().setIsSyncingAddress(false);
            toast.error('Address generation failed, please try again later');
            throw error;
          }
        }

        // Reset progress when completed
        get().setSyncProgress({ current: 0, total: 0, stage: 'idle' });
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
          // BigNumber(available).lt(minSubAccountThreshold)
          if (BigNumber(available).lt(minSubAccountThreshold)) {
            const neededAddressCount = Number(autoGenerateAddressCount);
            // get wallet information
            const walletStore = useWalletStore.getState();

            // Check if wallet mnemonic is available for address generation
            if (!walletStore.hasWalletMnemonic()) {
              console.error('Wallet information is incomplete, cannot generate addresses');
              return;
            }

            const { last_path } = merchantStore.addressUsage || {};
            let Newlast_path = last_path;
            if (!Newlast_path) {
              Newlast_path = "m/44'/195'/0'/0/0";
            }

            const pathIndex = Newlast_path?.match(/(\d+)'?$/);
            const currentStartIndex = parseInt(pathIndex?.[1] || '0') + 1;
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
