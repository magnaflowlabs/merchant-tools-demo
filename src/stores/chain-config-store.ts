import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChainConfig } from '@/types/merchant';

interface ChainConfigState {
  chainConfigs: ChainConfig[];
  isLoading: boolean;
  error: string | null;

  setChainConfigs: (configs: ChainConfig[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearChainConfigs: () => void;
}

export const useChainConfigStore = create<ChainConfigState>()(
  persist(
    (set) => ({
      chainConfigs: [],
      isLoading: false,
      error: null,

      setChainConfigs: (configs) => set({ chainConfigs: configs, error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearChainConfigs: () => set({ chainConfigs: [], error: null }),
    }),
    {
      name: 'chain-config-storage',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
