import { create } from 'zustand';

/**
 * Independent selection state management
 *
 * Separate selection state from order data to avoid selection operations triggering large data copying
 */

interface SelectionState {
  // Payout order selection
  selectedPayoutOrders: Set<string>;

  // Payin order selection (recharge)
  selectedPayinOrders: Set<string>;

  // Actions
  setPayoutSelected: (id: string, selected: boolean) => void;
  setPayoutSelectedMany: (ids: string[], selected: boolean) => void;
  selectAllPayoutOrders: (ids: string[]) => void;
  clearPayoutSelection: () => void;
  isPayoutOrderSelected: (id: string) => boolean;

  setPayinSelected: (address: string, selected: boolean) => void;
  setPayinSelectedMany: (addresses: string[], selected: boolean) => void;
  clearPayinSelection: () => void;
  isPayinOrderSelected: (address: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedPayoutOrders: new Set(),
  selectedPayinOrders: new Set(),
  setPayoutSelected: (id, selected) =>
    set((state) => {
      const newSet = new Set(state.selectedPayoutOrders);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return { selectedPayoutOrders: newSet };
    }),

  setPayoutSelectedMany: (ids, selected) =>
    set((state) => {
      const newSet = new Set(state.selectedPayoutOrders);
      ids.forEach((id) => {
        if (selected) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
      return { selectedPayoutOrders: newSet };
    }),

  selectAllPayoutOrders: (ids) =>
    set({
      selectedPayoutOrders: new Set(ids),
    }),

  clearPayoutSelection: () =>
    set({
      selectedPayoutOrders: new Set(),
    }),

  isPayoutOrderSelected: (id) => get().selectedPayoutOrders.has(id),

  // Payin order selection
  setPayinSelected: (address, selected) =>
    set((state) => {
      const newSet = new Set(state.selectedPayinOrders);
      if (selected) {
        newSet.add(address);
      } else {
        newSet.delete(address);
      }
      return { selectedPayinOrders: newSet };
    }),

  setPayinSelectedMany: (addresses, selected) =>
    set((state) => {
      const newSet = new Set(state.selectedPayinOrders);
      addresses.forEach((address) => {
        if (selected) {
          newSet.add(address);
        } else {
          newSet.delete(address);
        }
      });
      return { selectedPayinOrders: newSet };
    }),

  clearPayinSelection: () =>
    set({
      selectedPayinOrders: new Set(),
    }),

  isPayinOrderSelected: (address) => get().selectedPayinOrders.has(address),
}));
