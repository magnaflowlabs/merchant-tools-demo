import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PayinOrderStatus } from '@/types/merchant';
import { MIN_USDT_AMOUNT } from '@/config/constants';

interface PayinOrderStatusState {
  payinOrdersStatus: Record<string, PayinOrderStatus>;

  setOrderStatus: (key: string, status: PayinOrderStatus) => void;
  setOrdersStatus: (
    orders: Array<{
      address: string;
      created_at: string;
      usdt: number;
      value: number;
    }>,
    status: PayinOrderStatus
  ) => void;
  getOrderStatus: (key: string) => PayinOrderStatus | undefined;
  removeOrderStatus: (key: string) => void;
  clearAllStatus: () => void;

  updateOrdersStatus: (statusUpdates: Array<{ key: string; status: PayinOrderStatus }>) => void;

  getStatusStats: () => {
    total: number;
    pending: number;
    collecting: number;
    success: number;
    failed: number;
    recharging: number;
  };

  getOrdersByStatus: (status: PayinOrderStatus) => string[];
}

export const usePayinOrderStatusStore = create<PayinOrderStatusState>()(
  persist(
    (set, get) => ({
      payinOrdersStatus: {},
      // set single order status
      setOrderStatus: (key: string, status: PayinOrderStatus) => {
        set((state) => ({
          payinOrdersStatus: {
            ...state.payinOrdersStatus,
            [key]: status,
          },
        }));
      },
      // set multiple order status
      setOrdersStatus: (
        orders: Array<{
          address: string;
          created_at: string;
          usdt: number;
          value: number;
        }>,
        status: PayinOrderStatus
      ) => {
        set((state) => {
          const updates: Record<string, PayinOrderStatus> = {};
          orders.forEach((order) => {
            const key = `${order.address}${order.created_at}${order.usdt}`;
            updates[key] = status;
            // if (order.value < MIN_USDT_AMOUNT) {
            //   updates[key] = PayinOrderStatus.AwaitingDeposit;
            // } else {
            //   updates[key] = status;
            // }
          });

          return {
            payinOrdersStatus: {
              ...state.payinOrdersStatus,
              ...updates,
            },
          };
        });
      },

      getOrderStatus: (key: string) => {
        const state = get();
        return state.payinOrdersStatus[key];
      },

      removeOrderStatus: (key: string) => {
        set((state) => {
          const newStatus = { ...state.payinOrdersStatus };
          delete newStatus[key];
          return { payinOrdersStatus: newStatus };
        });
      },

      clearAllStatus: () => {
        set({ payinOrdersStatus: {} });
      },

      updateOrdersStatus: (statusUpdates: Array<{ key: string; status: PayinOrderStatus }>) => {
        set((state) => {
          const updates: Record<string, PayinOrderStatus> = {};
          statusUpdates.forEach(({ key, status }) => {
            updates[key] = status;
          });

          return {
            payinOrdersStatus: {
              ...state.payinOrdersStatus,
              ...updates,
            },
          };
        });
      },

      getStatusStats: () => {
        const state = get();
        const stats = {
          total: 0,
          pending: 0,
          collecting: 0,
          success: 0,
          failed: 0,
          recharging: 0,
        };

        Object.values(state.payinOrdersStatus).forEach((status) => {
          stats.total++;
          switch (status) {
            case PayinOrderStatus.Pending:
              stats.pending++;
              break;
            case PayinOrderStatus.Collecting:
              stats.collecting++;
              break;
            case PayinOrderStatus.Confirming:
              stats.success++;
              break;
            case PayinOrderStatus.CollectFailed:
              stats.failed++;
              break;
            case PayinOrderStatus.Depositing:
              stats.recharging++;
              break;
          }
        });

        return stats;
      },

      getOrdersByStatus: (status: PayinOrderStatus) => {
        const state = get();
        return Object.entries(state.payinOrdersStatus)
          .filter(([_, orderStatus]) => orderStatus === status)
          .map(([key, _]) => key);
      },
    }),
    {
      name: 'payin-order-status-storage',
      // partialize: (state) => ({ payinOrdersStatus: state.payinOrdersStatus }),
    }
  )
);
