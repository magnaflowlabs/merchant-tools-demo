import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryCollectionHistory, queryAddressUsage } from '@/services/ws/api';
import { useWebSocketService } from '@/services/ws';
import { useAuthStore } from './auth-store';
import type { CollectionHistoryParams, CollectionHistoryResponse } from '@/services/ws/type';
interface MerchantState {
  addressUsage: {
    available: number;
    allocated: number;
    last_path: string;
  } | null;

  lastPath: string;

  collectionHistory: CollectionHistoryResponse | null;

  isPaying: boolean;

  isCollecting: boolean;

  isAutoPaying: boolean;

  isAutoTopping: boolean;

  minBalance: number;

  error: string | null;

  queryAddressUsage: () => Promise<void>;
  updateAddressUsage: (addressUsage: {
    available: number;
    allocated: number;
    last_path: string;
  }) => void;
  queryCollectionHistory: (args: CollectionHistoryParams) => Promise<void>;
  startPaying: () => Promise<void>;
  cancelPaying: () => void;
  startCollecting: () => Promise<void>;
  cancelCollecting: () => void;
  startAutoPaying: () => void;
  stopAutoPaying: () => void;
  startAutoTopping: () => void;
  stopAutoTopping: () => void;
  setMinBalance: (balance: number) => void;
  clearError: () => void;
}

export const useMerchantStore = create<MerchantState>()(
  persist(
    (set, get) => ({
      addressUsage: null,
      collectionHistory: null,
      isPaying: false,
      isCollecting: false,
      isAutoPaying: false,
      isAutoTopping: false,
      minBalance: 200,
      error: null,
      lastPath: '',

      queryAddressUsage: async () => {
        set({ error: null });
        const { cur_chain } = useAuthStore.getState();
        try {
          const response = await queryAddressUsage({ chain: cur_chain.chain });
          if (response?.data) {
            const { last_path } = response?.data;
            set({ lastPath: last_path });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Query address usage failed',
          });
        }
      },

      updateAddressUsage: (addressUsage: {
        available: number;
        allocated: number;
        last_path: string;
      }) => {
        set({ addressUsage });
      },

      queryCollectionHistory: async (args: CollectionHistoryParams) => {
        set({ error: null });

        try {
          const response = await queryCollectionHistory(args);
          set({
            collectionHistory: response.data,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Query collection history failed',
          });
        }
      },

      startPaying: async () => {
        const { ws } = useWebSocketService();

        if (!ws.isConnected()) {
          set({ error: 'WebSocket not connected' });
          return;
        }

        set({ isPaying: true, error: null });
      },

      cancelPaying: () => {
        set({ isPaying: false });
      },

      startCollecting: async () => {
        set({ isCollecting: true, error: null });
        try {
        } catch (error) {
          set({
            isCollecting: false,
            error: error instanceof Error ? error.message : 'subscribe collection orders failed:',
          });
          console.error('subscribe collection orders failed:', error);
        }
      },

      cancelCollecting: () => {
        set({ isCollecting: false });
      },

      startAutoPaying: () => {
        set({ isAutoPaying: true });
      },

      stopAutoPaying: () => {
        set({ isAutoPaying: false });
      },

      startAutoTopping: () => {
        set({ isAutoTopping: true });
      },

      stopAutoTopping: () => {
        set({ isAutoTopping: false });
      },

      setMinBalance: (balance: number) => {
        set({ minBalance: balance });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'merchant-store',
      partialize: (state) => ({
        isPaying: state.isPaying,
        isCollecting: state.isCollecting,
        minBalance: state.minBalance,
      }),
    }
  )
);
