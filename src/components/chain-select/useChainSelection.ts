import { useState, useCallback } from 'react';
import { useShallow } from '@/stores';
import { useMerchantStore } from '@/stores/merchant-store';
import { useSyncConfigStore } from '@/stores/sync-config-store';
import { useOrderStore } from '@/stores/order-store';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { resetOrderBatcher } from '@/services/PushMessageService';

export function useChainSelection() {
  // Note: curCollectionAddressInfo is now obtained in components through useCollectionAddressInfo hook
  // No longer returned from here to avoid duplicate subscriptions

  const payinOrderStatusStore = usePayinOrderStatusStore();
  const { isCollecting, cancelCollecting } = useMerchantStore(
    useShallow((state) => ({
      isCollecting: state.isCollecting,
      cancelCollecting: state.cancelCollecting,
    }))
  );
  const { isSyncingAddress, setIsSyncingAddress } = useSyncConfigStore(
    useShallow((state) => ({
      isSyncingAddress: state.isSyncingAddress,
      setIsSyncingAddress: state.setIsSyncingAddress,
    }))
  );
  const clearAllOrders = useOrderStore((state) => state.clearAllOrders);
  const { chainConfigs, setCurChainConfig } = useChainConfigStore(
    useShallow((state) => ({
      chainConfigs: state.chainConfigs,
      setCurChainConfig: state.setCurChainConfig,
    }))
  );

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChainValue, setPendingChainValue] = useState('');

  const performChainChange = useCallback(
    (value: string) => {
      try {
        // Find corresponding chain configuration
        const newChainConfig = chainConfigs.find((config) => config.chain === value);
        if (!newChainConfig) {
          console.error(`Chain configuration not found: ${value}`);
          return;
        }

        // Set current chain config, curCollectionAddressInfo will be automatically derived via useCollectionAddressInfo
        setCurChainConfig(newChainConfig);

        // Reset pending push batches to avoid stale data being flushed after clear
        resetOrderBatcher();

        // Clear orders and status
        clearAllOrders();
        payinOrderStatusStore.clearAllStatus();
      } catch (error) {
        console.error('Chain switch failed:', error);
      }
    },
    [chainConfigs, setCurChainConfig, clearAllOrders, payinOrderStatusStore]
  );

  const handleChainChange = useCallback(
    (value: string) => {
      if (!value) {
        console.warn('Invalid chain value provided');
        return;
      }

      if (isCollecting || isSyncingAddress) {
        setPendingChainValue(value);
        setShowConfirmDialog(true);
      } else {
        performChainChange(value);
      }
    },
    [isCollecting, isSyncingAddress, performChainChange]
  );

  const handleConfirmChange = useCallback(() => {
    if (!pendingChainValue) {
      console.warn('No pending chain value to confirm');
      return;
    }

    performChainChange(pendingChainValue);
    setShowConfirmDialog(false);
    setPendingChainValue('');
    setIsSyncingAddress(false);
    cancelCollecting();
  }, [pendingChainValue, performChainChange, setIsSyncingAddress, cancelCollecting]);

  const handleCancelChange = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingChainValue('');
  }, []);

  return {
    showConfirmDialog,
    pendingChainValue,
    handleChainChange,
    handleConfirmChange,
    handleCancelChange,
  };
}
