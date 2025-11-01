import { create } from 'zustand';
import { PayinOrderStatus } from '@/types/merchant';
import { type PayinOrder, type PayoutOrder } from '@/types/merchant';
import { MIN_TRX_AMOUNT } from '@/config/constants';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import BigNumber from 'bignumber.js';
import { showExpandableToast } from '@/utils/toast-utils.tsx';
import { ShardedMap } from './mapSlice';
export enum PayoutOrderStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Confirming = 'Confirming',
  Failed = 'Failed',
  Success = 'Success',
  Locked = 'Locked',
}

export interface ExtendedPayoutOrder extends PayoutOrder {
  status: PayoutOrderStatus;
  isLocked: boolean;
}

interface OrderState {
  // payin orders - Map format
  payinOrders: Map<string, PayinOrder>;

  // recharge orders - Map format
  rechargeOrders: Map<string, PayinOrder>;
  // payout orders - ShardedMap format, key is bill_no
  payoutOrders: ShardedMap<ExtendedPayoutOrder>;
  payoutOrdersStatusManager: Map<string, { status: PayoutOrderStatus; isLocked?: boolean }>;
  // ✅ Cached statistics to avoid repeated calculations
  payoutOrdersStats: {
    totalCount: number;
    totalAmount: number;
  };
  // actions
  addPayinOrders: (orders: PayinOrder[]) => void;
  addPayoutOrders: (orders: PayoutOrder[]) => void;
  hasCompletedOrders: boolean;
  // payout order status management methods
  updatePayoutOrdersStatus: (
    bill_nos: string[],
    statusObj: { status: PayoutOrderStatus; isLocked?: boolean }
  ) => void;

  setHasCompletedOrders: (hasCompletedOrders: boolean) => void;
  // stats
  getPayinStats: () => {
    totalCount: number;
    totalValue: number;
  };

  // clear all orders data
  clearAllOrders: () => void;
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  hasCompletedOrders: false,
  payinOrders: new Map<string, PayinOrder>(),
  rechargeOrders: new Map<string, PayinOrder>(),
  payoutOrders: new ShardedMap<ExtendedPayoutOrder>(200), // 200 shards, suitable for high-capacity data
  payoutOrdersStatusManager: new Map<string, { status: PayoutOrderStatus; isLocked?: boolean }>(),
  payoutOrdersStats: {
    totalCount: 0,
    totalAmount: 0,
  },
  setHasCompletedOrders: (hasCompletedOrders: boolean) => {
    set({ hasCompletedOrders });
  },

  addPayinOrders: (orders: PayinOrder[]) => {
    set((state) => {
      const newPayinOrdersMap = new Map(state.payinOrders);
      const newRechargeOrdersMap = new Map(state.rechargeOrders);
      const payinOrderStatusStore = usePayinOrderStatusStore.getState();
      // add new orders to Map, key is address
      orders.forEach((order: PayinOrder) => {
        if (BigNumber(order.usdt).lte(BigNumber(0.01).multipliedBy(1e6))) {
          newPayinOrdersMap.delete(order.address);
          newRechargeOrdersMap.delete(order.address);
        } else {
          payinOrderStatusStore.setOrderStatus(order.address, PayinOrderStatus.Pending);
          if (BigNumber(order.value).gte(BigNumber(MIN_TRX_AMOUNT))) {
            newRechargeOrdersMap.delete(order.address);
            newPayinOrdersMap.set(order.address, order);
          } else {
            // value < MIN_TRX_AMOUNT, put into recharge order Map
            newPayinOrdersMap.delete(order.address);
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
    const state = get();
    const _completedOrderMessages: string[] = [];

    // Prepare batch operations
    const entriesToAdd: [string, ExtendedPayoutOrder][] = [];
    const keysToDelete: string[] = [];

    for (const order of orders) {
      if (!order.bill_no) {
        console.warn('Skipping order without bill_no:', order);
        continue;
      }

      if (!order.to) {
        console.warn(`Order ${order.bill_no} has no to address, skipping:`, order);
        continue;
      }

      if (order.status === 'completed') {
        _completedOrderMessages.push(`Pay to ${order.to} ${order.amount} ${order.token}`);
        keysToDelete.push(order.bill_no);
        state.updatePayoutOrdersStatus([order.bill_no], { status: PayoutOrderStatus.Success });
        continue;
      }

      const extendedOrder: ExtendedPayoutOrder = {
        ...order,
        status: order.status === 'locked' ? PayoutOrderStatus.Locked : PayoutOrderStatus.Pending,
        isLocked: false,
      };

      entriesToAdd.push([order.bill_no, extendedOrder]);
    }

    // ✅ Incrementally update statistics to avoid traversing all orders
    let totalAmount = state.payoutOrdersStats.totalAmount;

    // ✅ Key: Get order information to be deleted first (before deletion)
    for (const bill_no of keysToDelete) {
      const order = state.payoutOrders.get(bill_no);

      if (order) {
        // Subtract amount and count of deleted orders
        totalAmount = BigNumber(totalAmount).minus(order.amount).toNumber();
      }
    }

    // Add amount and count of new orders
    for (const [, order] of entriesToAdd) {
      totalAmount = BigNumber(totalAmount).plus(order.amount).toNumber();
    }

    // ✅ Batch operations without copying data
    if (entriesToAdd.length > 0) {
      state.payoutOrders.setMany(entriesToAdd);
    }

    if (keysToDelete.length > 0) {
      state.payoutOrders.deleteMany(keysToDelete);
    }

    let totalCount = state.payoutOrders.size;

    // Display completed order messages
    if (_completedOrderMessages.length > 0) {
      showExpandableToast(_completedOrderMessages, {
        duration: 2000,
        maxItemsBeforeCollapse: 15,
        initialDisplayCount: 5,
      });
    }

    // ✅ Return the same object, version number automatically updated
    set({
      payoutOrders: state.payoutOrders,
      payoutOrdersStats: {
        totalCount,
        totalAmount,
      },
    });
  },

  updatePayoutOrdersStatus: (
    bill_nos: string[],
    statusObj: { status: PayoutOrderStatus; isLocked?: boolean }
  ) => {
    set((state) => {
      const newPayoutOrdersStatusManager = new Map(state.payoutOrdersStatusManager);
      // Update specified order status
      bill_nos.forEach((bill_no) => {
        if (statusObj.status === PayoutOrderStatus.Pending) {
          newPayoutOrdersStatusManager.delete(bill_no);
        } else {
          newPayoutOrdersStatusManager.set(bill_no, { ...statusObj });
        }
      });

      return {
        payoutOrdersStatusManager: newPayoutOrdersStatusManager,
        payoutOrdersStats: {
          ...state.payoutOrdersStats,
        },
      };
    });
  },

  getPayinStats: () => {
    const { payinOrders } = get();
    // Use ShardedMap's values iterator for efficient traversal
    let totalCount = 0;
    let totalValue = 0;

    for (const order of payinOrders.values()) {
      totalCount++;
      const value = Number(order.usdt) || 0;
      totalValue += value;
    }

    return {
      totalCount,
      totalValue: totalValue / 1000000,
    };
  },

  // clear all orders data
  clearAllOrders: () => {
    set({
      payinOrders: new Map<string, PayinOrder>(),
      rechargeOrders: new Map<string, PayinOrder>(),
      payoutOrders: new ShardedMap<ExtendedPayoutOrder>(200),
      hasCompletedOrders: false,
      payoutOrdersStatusManager: new Map<
        string,
        { status: PayoutOrderStatus; isLocked?: boolean }
      >(),
      payoutOrdersStats: {
        totalCount: 0,
        totalAmount: 0,
      },
    });
  },
}));
