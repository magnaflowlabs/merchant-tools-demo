import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  storeMnemonic,
  getMnemonic,
  removeMnemonic,
  hasStoredMnemonic,
} from '@/utils/mnemonic-manager';

interface WalletImportedData {
  imported: boolean;
  name?: string;
  address?: string;
  keystoreData?: string;
  password?: string;
  keystore_id: string;
}

interface WalletState {
  isWalletImported: boolean;
  walletName: string | null;
  walletAddress: string | null;
  keystoreData: string | null;
  walletPassword: string | null;
  tempMnemonic: string | null;
  keystore_id: string | null;
  // actions
  setWalletImported: ({
    imported,
    name,
    address,
    keystoreData,
    password,
    keystore_id,
  }: WalletImportedData) => void;
  setTempMnemonic: (mnemonic: string | null) => void;
  clearWallet: () => void;
  clearTempMnemonic: () => void;
  // mnemonic management
  storeWalletMnemonic: (mnemonic: string) => Promise<void>;
  getWalletMnemonic: () => Promise<string | null>;
  hasWalletMnemonic: () => boolean;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      isWalletImported: false,
      walletName: null,
      walletAddress: null,
      keystoreData: null,
      walletPassword: null,
      tempMnemonic: null,
      keystore_id: null,

      // set wallet imported status
      setWalletImported: ({ imported, name, address, keystoreData, password, keystore_id }) =>
        set({
          isWalletImported: imported,
          walletName: name || null,
          walletAddress: address || null,
          keystoreData: keystoreData || null,
          walletPassword: password || null,
          keystore_id: keystore_id || null,
        }),

      // set temporary mnemonic (for wallet creation process)
      setTempMnemonic: (mnemonic) => set({ tempMnemonic: mnemonic }),

      // clear wallet state
      clearWallet: () => {
        const state = get();
        // when clearing wallet, also delete stored mnemonic
        if (state.keystore_id) {
          removeMnemonic(state.keystore_id);
        }
        set({
          isWalletImported: false,
          walletName: null,
          walletAddress: null,
          keystoreData: null,
          walletPassword: null,
          keystore_id: null,
        });
      },

      // clear temporary mnemonic
      clearTempMnemonic: () => set({ tempMnemonic: null }),

      // store wallet mnemonic
      storeWalletMnemonic: async (mnemonic: string) => {
        const state = get();
        if (state.keystore_id) {
          try {
            await storeMnemonic(mnemonic, state.keystore_id);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('Cannot store mnemonic:', error);
            }
            throw error;
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn('Cannot store mnemonic: keystore_id does not exist');
          }
          throw new Error('Keystore ID not found');
        }
      },

      // get wallet mnemonic
      getWalletMnemonic: async () => {
        const state = get();
        if (state.keystore_id) {
          try {
            return await getMnemonic(state.keystore_id);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('Failed to get mnemonic:', error);
            }
            return null;
          }
        }
        return null;
      },

      // check if mnemonic is stored
      hasWalletMnemonic: () => {
        const state = get();
        if (state.keystore_id) {
          return hasStoredMnemonic(state.keystore_id);
        }
        return false;
      },
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        isWalletImported: state.isWalletImported,
        walletName: state.walletName,
        walletAddress: state.walletAddress,
        // Do NOT persist raw keystore data and password for security
        // keystoreData: state.keystoreData,
        // walletPassword: state.walletPassword,
        tempMnemonic: state.tempMnemonic,
        keystore_id: state.keystore_id,
      }),
    }
  )
);
