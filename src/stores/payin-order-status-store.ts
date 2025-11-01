import { create } from 'zustand';
import { PayinOrderStatus } from '@/types/merchant';
interface PayinOrderStatusState {
  payinOrdersStatus: Map<string, PayinOrderStatus>;

  setOrderStatus: (key: string, status: PayinOrderStatus) => void;
  getOrderStatus: (key: string) => PayinOrderStatus | undefined;
  removeOrderStatus: (key: string) => void;
  clearAllStatus: () => void;
}

export const usePayinOrderStatusStore = create<PayinOrderStatusState>()((set, get) => ({
  payinOrdersStatus: new Map<string, PayinOrderStatus>(),
  setOrderStatus: (key: string, status: PayinOrderStatus) => {
    set((state) => {
      const newMap = new Map(state.payinOrdersStatus);
      newMap.set(key, status);
      return { payinOrdersStatus: newMap };
    });
  },

  getOrderStatus: (key: string) => {
    return get().payinOrdersStatus.get(key);
  },

  removeOrderStatus: (key: string) => {
    set((state) => {
      const newMap = new Map(state.payinOrdersStatus);
      newMap.delete(key);
      return { payinOrdersStatus: newMap };
    });
  },

  clearAllStatus: () => {
    set({ payinOrdersStatus: new Map<string, PayinOrderStatus>() });
  },
}));
