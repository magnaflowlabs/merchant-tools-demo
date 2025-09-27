import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type PayinOrder, type PayoutOrder } from '@/types/merchant';
import { MIN_TRX_AMOUNT } from '@/config/constants';
import { toast } from 'sonner';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
export enum PayoutOrderStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Confirming = 'Confirming',
  Failed = 'Failed',
  Success = 'Success',
}

// extend PayoutOrder type, add status field
export interface ExtendedPayoutOrder extends PayoutOrder {
  status: PayoutOrderStatus;
  selected: boolean;
  txHash: string;
  isLocked: boolean;
  timestamp?: number;
  user_id: string;
}

interface OrderState {
  // payin orders - Map format
  payinOrders: Map<string, PayinOrder>;

  // recharge orders - Map format
  rechargeOrders: Map<string, PayinOrder>;

  // payout orders - Map format, key is bill_no
  payoutOrders: Map<string, ExtendedPayoutOrder>;

  // actions
  addPayinOrders: (orders: PayinOrder[]) => void;
  addPayoutOrders: (orders: PayoutOrder[]) => void;

  // payout order status management methods
  updatePayoutOrdersStatus: (
    bill_nos: string[],
    statusObj: { status: PayoutOrderStatus; txHash?: string; isLocked?: boolean }
  ) => void;

  // selected status management methods
  setPayoutOrderSelected: (bill_no: string, selected: boolean) => void;
  setPayoutOrdersSelected: (bill_nos: string[], selected: boolean) => void;
  selectAllPayoutOrders: (selected: boolean) => void;
  getSelectedPayoutOrders: () => ExtendedPayoutOrder[];

  // stats
  getPayinStats: () => {
    totalCount: number;
    totalValue: number;
    todayCount: number;
    todayValue: number;
  };

  // clear all orders data
  clearAllOrders: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      payinOrders: new Map<string, PayinOrder>(),
      rechargeOrders: new Map<string, PayinOrder>(),
      payoutOrders: new Map<string, ExtendedPayoutOrder>(),

      addPayinOrders: (orders: PayinOrder[]) => {
        set((state) => {
          const newPayinOrdersMap = new Map(state.payinOrders);
          const newRechargeOrdersMap = new Map(state.rechargeOrders);
          // add new orders to Map, key is address
          orders.forEach((order: PayinOrder) => {
            // remove orders with same address from two Maps to ensure uniqueness
            newPayinOrdersMap.delete(order.address);
            newRechargeOrdersMap.delete(order.address);
            if (Number(order.usdt) == 0) {
              // if usdt is 0, means collection success
              if (newPayinOrdersMap.get(order.address)) {
                newPayinOrdersMap.delete(order.address);
              }
            } else {
              // according to value and MIN_TRX_AMOUNT comparison decide which Map to put into
              usePayinOrderStatusStore
                .getState()
                .removeOrderStatus(`${order.address}${order.created_at}`);
              if (Number(order.value) >= MIN_TRX_AMOUNT) {
                // value >= MIN_TRX_AMOUNT, put into collection order Map
                newPayinOrdersMap.set(order.address, order);
              } else {
                // value < MIN_TRX_AMOUNT, put into recharge order Map
                newRechargeOrdersMap.set(order.address, order);
              }
            }
          });

          return {
            payinOrders: newPayinOrdersMap,
            rechargeOrders: newRechargeOrdersMap,
          };
        });
      },

      addPayoutOrders: (orders: PayoutOrder[]) => {
        set((state) => {
          const newPayoutOrdersMap = new Map(state.payoutOrders);
          // add new orders to Map, key is bill_no
          let successOrders: string[] = [];
          orders.forEach((order) => {
            if (order.status == 'completed') {
              if (newPayoutOrdersMap.get(order.bill_no)) {
                newPayoutOrdersMap.delete(order.bill_no);
                successOrders.push(`Pay to ${order.to} ${order.amount} ${order.token}`);
              }
            } else {
              // Validate order data before adding
              if (!order.bill_no) {
                console.warn('Skipping order without bill_no:', order);
                return;
              }

              // Ensure address fields are not null/undefined
              const targetAddress = order.to || '';
              if (!targetAddress) {
                console.warn(`Order ${order.bill_no} has no valid address, skipping:`, order);
                return;
              }

              const extendedOrder: ExtendedPayoutOrder = {
                ...order,
                to_address: targetAddress, // Ensure consistency
                to: targetAddress, // Ensure consistency
                status: PayoutOrderStatus.Pending,
                selected: false,
                txHash: '',
                isLocked: false,
              };
              newPayoutOrdersMap.set(order.bill_no, extendedOrder);
            }
          });

          successOrders.length > 0 &&
            toast.success('Payment Success', {
              description: successOrders.map((order) => order).join('\n'),
              style: {
                width: 'auto',
                whiteSpace: 'pre',
              },
              duration: 1500,
            });
          return { payoutOrders: newPayoutOrdersMap };
        });
      },

      updatePayoutOrdersStatus: (
        bill_nos: string[],
        statusObj: { status: PayoutOrderStatus; txHash?: string; isLocked?: boolean }
      ) => {
        set((state) => {
          const newPayoutOrdersMap = new Map(state.payoutOrders);
          bill_nos.forEach((bill_no) => {
            const order = newPayoutOrdersMap.get(bill_no);
            if (order) {
              newPayoutOrdersMap.set(bill_no, { ...order, ...statusObj });
            }
          });
          return { payoutOrders: newPayoutOrdersMap };
        });
      },

      // selected status management methods
      setPayoutOrderSelected: (bill_no: string, selected: boolean) => {
        set((state) => {
          const newPayoutOrdersMap = new Map(state.payoutOrders);
          const order = newPayoutOrdersMap.get(bill_no);
          if (order) {
            newPayoutOrdersMap.set(bill_no, { ...order, selected });
          }
          return { payoutOrders: newPayoutOrdersMap };
        });
      },

      setPayoutOrdersSelected: (bill_nos: string[], selected: boolean) => {
        set((state) => {
          const newPayoutOrdersMap = new Map(state.payoutOrders);
          bill_nos.forEach((bill_no) => {
            const order = newPayoutOrdersMap.get(bill_no);
            if (order) {
              newPayoutOrdersMap.set(bill_no, { ...order, selected, isLocked: true });
            }
          });
          return { payoutOrders: newPayoutOrdersMap };
        });
      },

      selectAllPayoutOrders: (selected: boolean) => {
        set((state) => {
          const newPayoutOrdersMap = new Map(state.payoutOrders);
          newPayoutOrdersMap.forEach((order, bill_no) => {
            newPayoutOrdersMap.set(bill_no, { ...order, selected });
          });
          return { payoutOrders: newPayoutOrdersMap };
        });
      },

      getSelectedPayoutOrders: () => {
        const { payoutOrders } = get();
        return Array.from(payoutOrders.values()).filter((order) => order.selected);
      },

      getPayinStats: () => {
        const { payinOrders } = get();
        const ordersArray = Array.from(payinOrders.values());
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const totalValue = ordersArray.reduce((sum, order) => {
          const value = Number(order.usdt) || 0;
          return sum + value;
        }, 0);

        return {
          totalCount: ordersArray.length,
          totalValue: totalValue / 1000000,
          todayCount: ordersArray.length,
          todayValue: totalValue / 1000000,
        };
      },

      // clear all orders data
      clearAllOrders: () => {
        set({
          payinOrders: new Map<string, PayinOrder>(),
          rechargeOrders: new Map<string, PayinOrder>(),
          payoutOrders: new Map<string, ExtendedPayoutOrder>(),
        });
      },
    }),
    {
      name: 'order-store',
      partialize: (state) => ({
        // only persist payoutOrders, exclude payinOrders from caching
        // payoutOrders: Array.from(state.payoutOrders.entries()),
      }),
      // when restoring from persisted data, convert array back to Map
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.payoutOrders)) {
          state.payoutOrders = new Map(state.payoutOrders);
        }
        // payinOrders will always start as empty Map since it's not persisted
        if (state) {
          state.payinOrders = new Map<string, PayinOrder>();
        }
      },
    }
  )
);
