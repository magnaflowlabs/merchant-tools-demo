import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, UserInfo } from '@/types/global';
import { useWalletStore } from './wallet-store';
import { useSyncConfigStore } from './sync-config-store';
import type { ChainInfo } from '@/types/merchant';
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      connUrl: '',
      username: '',
      cur_chain: {
        chain: '',
        collection_address: '',
        payout_contract_address: '',
        payout_contract_version: '',
      },
      setCurChain: (chain: ChainInfo) => set({ cur_chain: chain }),
      setUser: (user: UserInfo | null) => set({ user }),
      setIsAdmin: (isAdmin: boolean) => set({ isAdmin }),

      login: async (username: string, password: string, conn_url: string) => {
        try {
          set({
            user: { username, role: 'user' } as UserInfo,
            isAuthenticated: true,
            isAdmin: false,
            connUrl: conn_url,
          });

          return true;
        } catch (error) {
          return false;
        }
      },

      logout: () => {
        useWalletStore.getState().clearTempMnemonic();

        useSyncConfigStore.getState().resetToDefaults();

        const { username, connUrl } = get();
        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          username,
          connUrl,
          cur_chain: {
            chain: '',
            collection_address: '',
            payout_contract_address: '',
            payout_contract_version: '',
          },
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
        connUrl: state.connUrl,
        username: state.username,
        cur_chain: state.cur_chain,
      }),
    }
  )
);
