import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { stringToBytes32 } from '@/utils/bytes32-utils';
import { TronWeb } from 'tronweb';
import { payout_new_abi } from '@/constants/payout_abi_v2';

import { WalletConnectionByAddress } from '@/components/private-wallet';
import { RechargeDataTable, type CollectionDataTableRef } from './recharge-data-table';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { WalletConnection } from '@/components/ui/wallet-connection';
import { PayinOrderStatus } from '@/types/merchant';
import BigNumber from 'bignumber.js';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IconHelp } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useTronWeb } from '@/hooks/use-tronweb';
import { useAuthStore } from '@/stores/auth-store';
import { useMerchantStore } from '@/stores/merchant-store';
import { usePrivateKeyConnection } from '@/hooks/use-private-key-connection';
import { WorkAutoButton } from '@/components/customerUI';
import { useShallow } from 'zustand/react/shallow';
import { RECHARGE_CONFIG } from '@/config/constants';
import { useCollectionAddressInfo } from '@/hooks/use-collection-address-info';
import { useWebSocketService } from '@/services/ws';
import {
  merchantIsLockedRechargeOrder,
  merchantLockRechargeOrder,
  merchantUnlockRechargeOrder,
} from '@/services/ws/api';
import { getErrorMessage, isUserCancelledError } from '@/utils';

// Destructure constants from config
const {
  TRX_RECHARGE_AMOUNT,
  TRX_TOKEN_ADDRESS,
  EMPTY_BILL_NO,
  BATCH_SIZE,
  AUTO_CHECK_INTERVAL,
  AUTO_BATCH_INTERVAL,
  FEE_LIMIT,
} = RECHARGE_CONFIG;

export function LatestRechargeAddresses({}) {
  const { connected, address } = useWallet();
  const getOrderStatus = usePayinOrderStatusStore((state) => state.getOrderStatus);
  const setOrderStatus = usePayinOrderStatusStore((state) => state.setOrderStatus);
  const [localIsCollecting, setLocalIsCollecting] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const tableRef = useRef<CollectionDataTableRef>(null);
  const autoTopupAbortRef = useRef<boolean>(false);
  const { chainConfigs, curChainConfig } = useChainConfigStore(
    useShallow((state) => ({
      chainConfigs: state.chainConfigs,
      curChainConfig: state.curChainConfig,
    }))
  );
  const tronWebInstance = useTronWeb();
  const user = useAuthStore((state) => state.user);
  const TRX_RECHARGE_AMOUNT_ToSun = TronWeb.toSun(TRX_RECHARGE_AMOUNT);
  const curCollectionAddressInfo = useCollectionAddressInfo();
  const { isAutoTopping, startAutoTopping, stopAutoTopping } = useMerchantStore(
    useShallow((state) => ({
      isAutoTopping: state.isAutoTopping,
      startAutoTopping: state.startAutoTopping,
      stopAutoTopping: state.stopAutoTopping,
    }))
  );
  const { ws } = useWebSocketService();
  const {
    isConnected: privateKeyConnected,
    address: publicKeyAddress,
    getPrivateKey,
  } = usePrivateKeyConnection();
  const hasSelectedItems = useCallback(() => {
    return selectedCount > 0;
  }, [selectedCount]);
  // Shared batch topup logic
  const executeBatchTopup = useCallback(
    async (items: any[], isAutoMode = false) => {
      if (!items || items.length === 0) {
        throw new Error('No addresses to recharge');
      }

      if (!(connected || privateKeyConnected)) {
        throw new Error('You need to connect your wallet first');
      }

      if (!user?.merchant_id) {
        throw new Error('Merchant ID not found');
      }

      // 1) WebSocket & lock pre-check
      if (!ws.isConnected()) {
        throw new Error('WebSocket not connected');
      }

      const addressPrefixes = items.map((item) => item.address);
      const isLockedRechargeResp = await merchantIsLockedRechargeOrder(
        addressPrefixes,
        curChainConfig.chain
      );

      let preLockedData: string[] = [];
      if (isLockedRechargeResp.code === 200 && isLockedRechargeResp.data) {
        preLockedData = isLockedRechargeResp.data?.prefixies || [];
      } else {
        throw new Error('service kit_is_locked_prefix error');
      }

      if (preLockedData.length === 0) {
        new Promise((resolve) => setTimeout(resolve, 2000));
        return;
      }

      // Initialize TronWeb
      let tronweb = window.tronWeb;
      if (!tronweb) {
        throw new Error('Please connect your wallet first');
      }

      if (privateKeyConnected && !connected) {
        const privateKey = getPrivateKey();
        if (!privateKey) {
          throw new Error('Private key not found');
        }
        tronweb = tronWebInstance;
        tronweb.setPrivateKey(privateKey);
      }
      if (!curChainConfig.chain) {
        throw new Error('Chain configuration not found');
      }

      // step2) Actually lock
      const rechargeOrderLockedResp = await merchantLockRechargeOrder(
        preLockedData,
        curChainConfig.chain
      );
      let realLockedData: string[] = [];
      if (rechargeOrderLockedResp.code === 200 && rechargeOrderLockedResp.data) {
        realLockedData = rechargeOrderLockedResp.data?.prefixies || [];
      }

      if (realLockedData.length === 0) {
        new Promise((resolve) => setTimeout(resolve, 2000));
        return;
      }
      // Filter valid items based on realLockedData
      const afterLockedItems = items.filter((item) => realLockedData.includes(item.address));
      if (afterLockedItems.length === 0) {
        return;
      }

      // Update order status for locked items only
      afterLockedItems.forEach((item) => {
        setOrderStatus(item.address, PayinOrderStatus.Locked);
      });
      const totalAmount = new BigNumber(afterLockedItems.length)
        .multipliedBy(TRX_RECHARGE_AMOUNT_ToSun)
        .toNumber();

      // Initialize contract
      const contract = tronweb.contract(
        payout_new_abi,
        curCollectionAddressInfo.payout_contract_address
      );

      // Format orders array (only locked items)
      const ordersArray: [string, string, number][] = afterLockedItems.map((item) => [
        EMPTY_BILL_NO,
        item.address,
        BigNumber(TRX_RECHARGE_AMOUNT_ToSun).toNumber(),
      ]);

      // Get current address
      const currentAddress = connected ? address : publicKeyAddress;
      if (!currentAddress) {
        throw new Error('Wallet address not found');
      }

      // Get total fee
      const getTotalFeeForOrders = await contract
        .getTotalFeeFor(TRX_TOKEN_ADDRESS, afterLockedItems.length, totalAmount, currentAddress)
        .call();

      const merchantIdBytes32 = stringToBytes32(user.merchant_id);
      const requiredAmount = BigNumber(getTotalFeeForOrders)
        .plus(BigNumber(totalAmount))
        .toNumber();
      const trxBalance = await tronweb.trx.getBalance(currentAddress);

      if (BigNumber(trxBalance).lt(requiredAmount)) {
        throw new Error('Insufficient balance, please recharge your wallet first');
      }

      // Execute batch transfer
      let result: string | undefined;
      try {
        result = await contract
          .batchTransfer(merchantIdBytes32, TRX_TOKEN_ADDRESS, ordersArray, false)
          .send({
            callValue: requiredAmount,
            feeLimit: FEE_LIMIT,
          });
      } catch (error) {
        // Unlock if user cancels
        if (isUserCancelledError(error)) {
          await merchantUnlockRechargeOrder(realLockedData, curChainConfig.chain);
          realLockedData.forEach((address) => {
            setOrderStatus(address, PayinOrderStatus.Pending);
          });
          throw new Error('User cancelled transaction');
        }
        throw new Error(getErrorMessage(error) || 'Transaction failed');
      }

      if (!result) {
        throw new Error('Transaction broadcast failed - no transaction ID returned');
      }
      // Poll for transaction receipt
      realLockedData.forEach((address) => {
        setOrderStatus(address, PayinOrderStatus.Confirming);
      });

      // Clear table selection which will trigger onSelectionChange and update selectedCount
      tableRef.current?.clearSelection();
      if (isAutoMode) {
        let transactionReceipt: any;
        while (true) {
          transactionReceipt = await tronweb.trx.getTransactionInfo(result);
          if (transactionReceipt?.receipt) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        if (transactionReceipt.receipt?.result !== 'SUCCESS') {
          throw new Error('Authorization transaction failed');
        }
      }
      const mode = isAutoMode ? 'Auto' : 'Batch';
      toast.success(`${mode} recharge successful! Transaction ID: ${result?.slice(0, 12)}...`);
      return result;
    },
    [
      connected,
      privateKeyConnected,
      user,
      getPrivateKey,
      chainConfigs,
      curCollectionAddressInfo,
      address,
      publicKeyAddress,
    ]
  );

  // Manual topup button handler
  const handleStartTopup = async () => {
    if (!hasSelectedItems()) {
      return;
    }
    setLocalIsCollecting(true);

    try {
      // Get selected items
      let selectedItems = tableRef.current?.getSelectedItems() || [];

      if (!selectedItems || selectedItems.length === 0) {
        toast.error('Please select the addresses you want to recharge first');
        return;
      }

      // Filter out already confirmed addresses
      selectedItems = selectedItems.filter((item) => {
        const status = getOrderStatus(`${item.address}`);
        return !status || status === PayinOrderStatus.Pending;
      });

      if (!selectedItems || selectedItems.length === 0) {
        toast.error('The selected addresses are confirmed, please select other addresses');
        return;
      }

      if (!(connected || privateKeyConnected)) {
        toast.error('You need to connect your wallet first', {
          duration: 1500,
        });
        return;
      }

      // Execute batch topup using shared logic
      await executeBatchTopup(selectedItems, false);
    } catch (error) {
      console.error('Manual topup failed:', error);

      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('insufficient')) {
          toast.error('Insufficient TRX balance for batch transfer');
        } else if (error.message.includes('energy')) {
          toast.error('Insufficient energy for transaction');
        } else if (error.message.includes('fee')) {
          toast.error('Transaction fee calculation failed');
        } else if (error.message.includes('contract')) {
          toast.error('Contract interaction failed - please check contract address');
        } else {
          toast.error(`Manual topup failed: ${error.message}`);
        }
      } else {
        toast.error('Manual topup failed - please try again');
      }
    } finally {
      setLocalIsCollecting(false);
    }
  };

  const canStartTopup = useMemo(() => {
    return totalCount > 0 && selectedCount > 0 && !localIsCollecting;
  }, [totalCount, selectedCount, localIsCollecting]);

  // Auto Topup handler
  const handleAutoTopup = async () => {
    if (isAutoTopping) {
      stopAutoTopping();
      autoTopupAbortRef.current = true;
      return;
    }

    if (!privateKeyConnected || connected) {
      toast.error('Auto payment is only available for private key wallet', {
        duration: 1500,
      });
      return;
    }

    if (!privateKeyConnected || !publicKeyAddress) {
      toast.error('You need to connect your wallet first for auto topup', {
        duration: 1500,
      });
      return;
    }

    // Reset abort flag and start auto topping
    autoTopupAbortRef.current = false;
    startAutoTopping();

    try {
      // Auto topup logic - continuously process recharge addresses
      const processRechargeAddresses = async () => {
        let isWorking = false;

        while (!autoTopupAbortRef.current) {
          // Fix: Avoid busy waiting - sleep when busy
          if (isWorking) {
            await new Promise((resolve) => setTimeout(resolve, AUTO_CHECK_INTERVAL));
            continue;
          }

          // Check if auto topping is still enabled
          const { isAutoTopping: currentAutoTopping } = useMerchantStore.getState();
          if (!currentAutoTopping || autoTopupAbortRef.current) {
            break;
          }
          // Get fresh data from table on each iteration
          const rechargeTableData = tableRef.current?.getAllData() || [];
          let selectedRechargeAddresses = rechargeTableData.filter((addr) => {
            // Only process addresses with balance < 20 TRX and not confirming
            const status = getOrderStatus(`${addr.address}`);

            return (
              BigNumber(addr.value).lt(TRX_RECHARGE_AMOUNT_ToSun) &&
              status === PayinOrderStatus.Pending
            );
          });

          if (selectedRechargeAddresses.length === 0) {
            // No addresses need recharge, wait before checking again
            await new Promise((resolve) => setTimeout(resolve, AUTO_CHECK_INTERVAL));
            continue;
          }

          // Process batch of addresses
          const currentBatch = selectedRechargeAddresses.slice(0, BATCH_SIZE);

          try {
            isWorking = true;
            // Execute batch topup using shared logic
            await executeBatchTopup(currentBatch, true);
          } catch (error) {
            console.error('Auto topup batch failed:', error);

            if (error instanceof Error) {
              if (error.message.includes('insufficient')) {
                toast.error('Auto topup stopped: Insufficient TRX balance');
              } else if (error.message.includes('energy')) {
                toast.error('Auto topup stopped: Insufficient energy');
              } else {
                toast.error(`Auto topup failed: ${error.message}`);
              }
            } else {
              toast.error('Auto topup failed - unknown error');
            }

            // Stop auto topping on error
            stopAutoTopping();
            autoTopupAbortRef.current = true;
            break;
          } finally {
            // setLocalIsCollecting(false);
            isWorking = false;
          }

          // Wait before processing next batch
          await new Promise((resolve) => setTimeout(resolve, AUTO_BATCH_INTERVAL));

          // Final check before next iteration
          const { isAutoTopping: stillAutoTopping } = useMerchantStore.getState();
          if (!stillAutoTopping || autoTopupAbortRef.current) {
            break;
          }
        }
      };

      await processRechargeAddresses();
    } catch (error) {
      console.error('Auto topup error:', error);
      stopAutoTopping();
      autoTopupAbortRef.current = true;
    } finally {
      setLocalIsCollecting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Pending recharge addresses</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconHelp className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Only addresses with balance less than 20 TRX can be selected for recharge
                </p>
              </TooltipContent>
            </Tooltip>
          </Tooltip>
        </TooltipProvider>
        {selectedCount > 0 && (
          <span className="text-sm font-medium text-blue-800">
            Selected: {selectedCount} / {totalCount}
          </span>
        )}
        <CardDescription className="ml-auto flex items-center gap-2">
          {!isAutoTopping && (privateKeyConnected || connected) && (
            <Button
              className="flex items-center gap-2"
              onClick={handleStartTopup}
              disabled={!canStartTopup}
            >
              {localIsCollecting ? 'Recharge...' : 'Manual Recharge'}
            </Button>
          )}
          {privateKeyConnected && !connected && (
            <WorkAutoButton
              isActive={isAutoTopping}
              onToggle={handleAutoTopup}
              startLabel="Auto Recharge"
              stopLabel="Stop Recharge"
              disabled={localIsCollecting}
            />
          )}
          {!(privateKeyConnected || connected) && (
            <div className="flex items-center gap-4">
              <WalletConnectionByAddress />
              <div className="h-4 w-px bg-border" />
              <WalletConnection />
            </div>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <RechargeDataTable
          ref={tableRef}
          onSelectionChange={(selected, total) => {
            setSelectedCount(selected);
            setTotalCount(total);
          }}
        />
      </CardContent>
    </Card>
  );
}
