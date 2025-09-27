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
  storeWalletMnemonic: (mnemonic: string) => void;
  getWalletMnemonic: () => string | null;
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

      setWalletImported: ({ imported, name, address, keystoreData, password, keystore_id }) =>
        set({
          isWalletImported: imported,
          walletName: name || null,
          walletAddress: address || null,
          keystoreData: keystoreData || null,
          walletPassword: password || null,
          keystore_id: keystore_id || null,
        }),

      setTempMnemonic: (mnemonic) => set({ tempMnemonic: mnemonic }),

      clearWallet: () => {
        const state = get();
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

      clearTempMnemonic: () => set({ tempMnemonic: null }),

      storeWalletMnemonic: (mnemonic: string) => {
        const state = get();
        if (state.keystore_id) {
          storeMnemonic(mnemonic, state.keystore_id);
        } else {
          console.warn('Cannot store mnemonic: keystore_id does not exist');
        }
      },

      getWalletMnemonic: () => {
        const state = get();
        if (state.keystore_id) {
          return getMnemonic(state.keystore_id);
        }
        return null;
      },

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
        keystoreData: state.keystoreData,
        walletPassword: state.walletPassword,
        tempMnemonic: state.tempMnemonic,
        keystore_id: state.keystore_id,
      }),
    }
  )
);
