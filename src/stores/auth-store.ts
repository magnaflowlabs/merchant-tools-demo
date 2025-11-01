import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, UserInfo } from '@/types/global';
import type { MerchantProfile } from '@/services/ws/type';
import { useWalletStore } from './wallet-store';
import { useSyncConfigStore } from './sync-config-store';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profileData: null,
      isAuthenticated: false,
      isAdmin: false,
      connUrl: '',
      username: '',
      setUser: (user: UserInfo | null) => set({ user }),
      setProfileData: (profileData: MerchantProfile | null) => set({ profileData }),
      setIsAdmin: (isAdmin: boolean) => set({ isAdmin }),

      logout: () => {
        useWalletStore.getState().clearTempMnemonic();

        useSyncConfigStore.getState().resetToDefaults();

        const { username, connUrl } = get();
        set({
          user: null,
          profileData: null,
          isAuthenticated: false,
          isAdmin: false,
          username,
          connUrl,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profileData: state.profileData,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
        connUrl: state.connUrl,
        username: state.username,
      }),
    }
  )
);
