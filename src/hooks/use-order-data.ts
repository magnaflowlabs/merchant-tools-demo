import { useOrderStore } from '@/stores/order-store';

export const useOrderData = () => {
  const orderStore = useOrderStore();

  // collection orders related
  const { payinOrders, rechargeOrders, getPayinStats } = orderStore;

  // get collection orders statistics
  const payinStats = getPayinStats();

  return {
    // collection orders related
    payinOrders,
    rechargeOrders,
    payinStats,
  };
};
