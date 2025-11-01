import { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { PaymentDataTable } from './payment-data-table';
import type { PaymentDataTableRef } from './payment-data-table';
import { PayoutHistory } from './payout-history';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkAutoButton } from '@/components/customerUI';
import { PayoutOrderStatus, type ExtendedPayoutOrder } from '@/stores/order-store';
import { IconHelp } from '@tabler/icons-react';
import { useMerchantStore } from '@/stores/merchant-store';
import { useOrderStore } from '@/stores/order-store';
import { useSelectionStore } from '@/stores/selection-store';
import BigNumber from 'bignumber.js';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useAuthStore } from '@/stores/auth-store';
import {
  merchantLockPayoutOrder,
  merchantUnlockPayoutOrder,
  merchantIsLockedPayoutOrder,
} from '@/services/ws/api';
import { useWebSocketService } from '@/services/ws';
import { formatNumber, isUserCancelledError, getErrorMessage } from '@/utils';
import { payout_new_abi } from '@/constants/payout_abi_v2';
import { stringToBytes32 } from '@/utils/bytes32-utils';
import { usePrivateKeyConnection } from '@/hooks/use-private-key-connection';
import { useTronWeb } from '@/hooks/use-tronweb';
import { toast } from 'sonner';
import { TronWeb } from 'tronweb';
import { useUsdtContract } from '@/hooks/use-token-contract';
import { useShallow } from 'zustand/react/shallow';
import { RECHARGE_CONFIG } from '@/config/constants';
import { useCollectionAddressInfo } from '@/hooks/use-collection-address-info';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { WalletConnectionByAddress } from '@/components/private-wallet';
import { WalletConnection } from '@/components/ui/wallet-connection';
import { delay_fn } from '@/lib/utils';

export function PaymentTool() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const { connected, address } = useWallet();
  const {
    isConnected: privateKeyConnected,
    address: publicKeyAddress,
    getPrivateKey,
  } = usePrivateKeyConnection();
  const paymentDataTableRef = useRef<PaymentDataTableRef>(null);
  const user = useAuthStore((state) => state.user);
  const curCollectionAddressInfo = useCollectionAddressInfo();
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);

  const {
    isPaying: merchantIsPaying,
    isAutoPaying,
    error,
    clearError,
    startAutoPaying,
    stopAutoPaying,
  } = useMerchantStore(
    useShallow((state) => ({
      isPaying: state.isPaying,
      isAutoPaying: state.isAutoPaying,
      error: state.error,
      clearError: state.clearError,
      startAutoPaying: state.startAutoPaying,
      stopAutoPaying: state.stopAutoPaying,
    }))
  );
  const payoutOrdersVersion = useOrderStore((state) => state.payoutOrders.version);
  const payoutOrdersStatusManager = useOrderStore(
    useShallow((state) => state.payoutOrdersStatusManager)
  );
  const updatePayoutOrdersStatus = useOrderStore((state) => state.updatePayoutOrdersStatus);
  const payoutOrdersStats = useOrderStore((state) => state.payoutOrdersStats);

  const payoutOrders = useMemo(() => {
    return useOrderStore.getState().payoutOrders;
  }, [payoutOrdersVersion]);

  const { clearPayoutSelection, setPayoutSelectedMany } = useSelectionStore();

  const { ws } = useWebSocketService();
  const isWalletConnected = connected || privateKeyConnected;
  const currentAddress = address || publicKeyAddress;
  const curUsdtContractAddress = useUsdtContract();
  const tronWebInstance = useTronWeb();
  const executeBatchPayout = async (
    selectedOrders: ExtendedPayoutOrder[],
    forcePrivateKey: boolean = false
  ): Promise<{ success: boolean; message: string } | undefined> => {
    if (!isWalletConnected) {
      throw new Error('Please connect wallet first');
    }

    if (forcePrivateKey && (!privateKeyConnected || connected)) {
      throw new Error('Auto payment requires private key wallet only');
    }

    if (!ws.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    const orderBillNosFiltered = selectedOrders
      .filter(
        (order) => order.bill_no.length <= 32 && !payoutOrdersStatusManager.get(order.bill_no)
      )
      .map((order) => order.bill_no);
    const isLockedPayoutOrderResp = await merchantIsLockedPayoutOrder(
      orderBillNosFiltered,
      curChainConfig.chain
    );
    let preLockedData: string[] = [];
    if (isLockedPayoutOrderResp.code === 200 && isLockedPayoutOrderResp.data) {
      preLockedData = isLockedPayoutOrderResp.data?.prefixies || [];
    }

    if (preLockedData.length === 0) {
      await delay_fn();
      return;
    }

    let tronweb = window.tronWeb;
    if (privateKeyConnected && !connected) {
      const privateKey = getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found');
      }

      tronweb = tronWebInstance;
      tronweb.setPrivateKey(privateKey);
      tronweb.setAddress(currentAddress || '');
    }

    if (!tronweb) {
      throw new Error('Please connect wallet first');
    }

    if (!tronweb.fullNode || !tronweb.fullNode.host) {
      throw new Error('TronWeb instance is invalid, please reconnect wallet');
    }

    if (!currentAddress || !curUsdtContractAddress) {
      throw new Error('Wallet address not found or usdt contract address not found');
    }

    if (!tronweb.isAddress(currentAddress)) {
      throw new Error(`Invalid wallet address format: ${currentAddress}`);
    }

    if (!user?.merchant_id) {
      throw new Error('Merchant ID not found');
    }
    const contract = await tronweb.contract().at(curUsdtContractAddress);
    const payOutContract = tronweb.contract(
      payout_new_abi,
      curCollectionAddressInfo.payout_contract_address
    );

    const getAllowance = await contract
      .allowance(currentAddress, curCollectionAddressInfo.payout_contract_address)
      .call();

    const selectedOrdersFiltered = preLockedData.map(
      (item_bn) => selectedOrders.find((order) => order.bill_no === item_bn)!
    );

    if (selectedOrdersFiltered?.length === 0) {
      throw new Error('No valid orders found');
    }
    const totalAmount = selectedOrdersFiltered.reduce(
      (acc, cur) => BigNumber(acc).plus(cur.amount).toNumber(),
      0
    );

    const usdt = await contract.balanceOf(currentAddress).call();

    const totalAmountInWei = TronWeb.toSun(totalAmount);
    if (BigNumber(usdt).lte(BigNumber(totalAmountInWei))) {
      toast.error('Insufficient balance, please recharge your wallet first');
      if (forcePrivateKey) {
        try {
          stopAutoPaying();
          // await merchantUnlockPayoutOrder(preLockedData, curChainConfig.chain);
        } catch (unlockError) {
          console.error('Failed to unlock orders after insufficient balance:', unlockError);
        }
      }
      return;
    }
    const getTotalFeeForOrders = await payOutContract
      .getTotalFeeFor(
        curUsdtContractAddress,
        preLockedData.length,
        BigNumber(totalAmountInWei).toNumber(),
        currentAddress
      )
      .call();

    if (
      BigNumber(getAllowance.toString()).lt(BigNumber(totalAmountInWei).plus(getTotalFeeForOrders))
    ) {
      const approveParams = {
        feeLimit: RECHARGE_CONFIG.FEE_LIMIT,
      };

      try {
        const hash = await contract
          .approve(
            curCollectionAddressInfo.payout_contract_address,
            BigNumber(totalAmountInWei).plus(getTotalFeeForOrders).toString()
          )
          .send(approveParams);

        let approveReceipt: any;
        while (true) {
          approveReceipt = await tronweb.trx.getTransactionInfo(hash);
          if (approveReceipt?.receipt) {
            break;
          }
          await delay_fn();
        }

        if (approveReceipt.receipt?.result !== 'SUCCESS') {
          throw new Error('Authorization transaction failed');
        }
      } catch (error) {
        if (isUserCancelledError(error)) {
          throw new Error('User cancelled authorization');
        }

        throw new Error(getErrorMessage(error) || 'Authorization transaction failed');
      }
    }

    const payoutOrderLockedResp = await merchantLockPayoutOrder(
      preLockedData,
      curChainConfig.chain
    );
    let realLockedData: string[] = [];
    if (payoutOrderLockedResp.code === 200 && payoutOrderLockedResp.data) {
      realLockedData = payoutOrderLockedResp.data?.prefixies || [];
    }

    const afterLockedOrdersFiltered = realLockedData.map(
      (item_bn) => selectedOrders.find((order) => order.bill_no === item_bn)!
    );
    if (afterLockedOrdersFiltered?.length === 0) {
      await delay_fn();
      return;
    }

    const afterLockedOrdersNew: { billNo: string; to: string; amount: number }[] =
      afterLockedOrdersFiltered.map((order) => {
        return {
          billNo: order.bill_no,
          to: order.to,
          amount: BigNumber(order.amount).multipliedBy(1e6).toNumber(),
        };
      });

    const ordersArray: [string, string, number][] = afterLockedOrdersNew.map(
      ({ billNo, to, amount }) => [stringToBytes32(billNo), to, amount]
    );

    const merchantIdBytes32 = stringToBytes32(user.merchant_id);

    try {
      const result = await payOutContract
        .batchTransfer(merchantIdBytes32, curUsdtContractAddress, ordersArray, false)
        .send({ feeLimit: RECHARGE_CONFIG.FEE_LIMIT });

      if (result) {
        updatePayoutOrdersStatus(realLockedData, {
          status: PayoutOrderStatus.Confirming,
          isLocked: true,
        });
        clearPayoutSelection();
        return {
          success: true,
          message: 'Payment successful',
        };
      } else {
        throw new Error('Transaction broadcast failed, no transaction hash returned');
      }
    } catch (error) {
      if (isUserCancelledError(error)) {
        await merchantUnlockPayoutOrder(realLockedData, curChainConfig.chain);
        throw new Error('User cancelled transaction');
      }

      const errorMsg = getErrorMessage(error);
      throw new Error(errorMsg || 'Transaction failed');
    }
  };

  const handleBatchPayOut = async () => {
    if (selectedItems.length === 0) {
      toast.warning('Please select orders first');
      return;
    }

    if (isPaying) {
      toast.warning('Payment is in progress, please wait...');
      return;
    }

    setIsPaying(true);
    try {
      const selectedOrders = selectedItems.map((bill_no) => payoutOrders.get(bill_no)!);
      await executeBatchPayout(selectedOrders, false);
      setPayoutSelectedMany(selectedItems, false);
    } catch (error) {
      if (isUserCancelledError(error)) {
        toast.warning(getErrorMessage(error));
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        console.error('Payment failed:', error);
        toast.error('Payment failed, please try again');
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handleAutoPayOut = async () => {
    if (!privateKeyConnected || connected) {
      toast.error('Auto payment is only available for private key wallet');
      return;
    }

    if (isAutoPaying) {
      stopAutoPaying();
      return;
    }

    startAutoPaying();

    try {
      const processPendingOrders = async () => {
        let isWorking = false;

        while (true) {
          if (isWorking) {
            continue;
          }
          const { isAutoPaying: currentAutoPaying } = useMerchantStore.getState();
          if (!currentAutoPaying) {
            break;
          }
          const { payoutOrders: currentPayoutOrders, payoutOrdersStatusManager: statusMgr } =
            useOrderStore.getState();
          const pendingOrders: ExtendedPayoutOrder[] = [];
          for (const order of currentPayoutOrders.valuesInOrder()) {
            if (
              statusMgr.get(order.bill_no)?.status === PayoutOrderStatus.Pending ||
              !statusMgr.get(order.bill_no)?.status
            ) {
              pendingOrders.push(order);
            }
          }

          if (pendingOrders.length === 0) {
            await delay_fn();
            continue;
          }

          if (!ws.isConnected()) {
            toast.warning('WebSocket not connected, stopping auto payment');
            stopAutoPaying();
            break;
          }

          const batchSize = Math.min(RECHARGE_CONFIG.BATCH_SIZE, pendingOrders.length);
          const currentBatch = pendingOrders.slice(0, batchSize);
          isWorking = true;
          try {
            await executeBatchPayout(currentBatch, true);
          } catch (error) {
            console.error('Auto payment batch failed:', error);
            stopAutoPaying();
          } finally {
            isWorking = false;
          }
          await delay_fn(5000);
        }
      };

      await processPendingOrders();
    } catch (error) {
      console.error('Auto payment error:', error);
      stopAutoPaying();
    }
  };

  const handleTableSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedItems(selectedIds);
  }, []);
  const unlockOrders = async () => {
    const payoutOrders22 = Array.from(payoutOrders.valuesInOrder()).filter((order) => {
      return order.status === PayoutOrderStatus.Locked;
    });
    const lockedBillNos = payoutOrders22.map((order) => order.bill_no);

    if (lockedBillNos.length === 0) {
      toast.info('No orders to unlock');
      return;
    }

    const BATCH_LIMIT = 800;
    const total = lockedBillNos.length;
    let successBatches = 0;
    let failedBatches = 0;

    for (let i = 0; i < total; i += BATCH_LIMIT) {
      const batch = lockedBillNos.slice(i, i + BATCH_LIMIT);
      try {
        const resp = await merchantUnlockPayoutOrder(batch, curChainConfig.chain);
        if (resp?.code === 200) {
          successBatches += 1;
        } else {
          failedBatches += 1;
        }
      } catch (e) {
        console.error('unlock batch error', e);
        failedBatches += 1;
      }
    }

    if (failedBatches === 0) {
      toast.success(`Unlock completed, ${successBatches} batches, total ${total} orders`);
    } else if (successBatches === 0) {
      toast.error('Unlock failed: all batches failed');
    } else {
      toast.warning(
        `Partial unlock successful: ${successBatches} successful, ${failedBatches} failed`
      );
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <div>
          <p className="text-muted-foreground">
            Batch process payment transactions to improve payment efficiency
          </p>
        </div>
      </div>

      {merchantIsPaying && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-blue-700 font-medium">
              Payment order push subscribed, listening for new payment orders...
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2  gap-4">
        <StatCard
          title={`Unpaid orders`}
          value={formatNumber(payoutOrdersStats.totalCount)}
          color="blue"
        />
        <StatCard
          title={`Unpaid amount (USDT)`}
          value={formatNumber(payoutOrdersStats.totalAmount)}
          color="green"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending payment addresses
            {(privateKeyConnected || connected) && (
              <Button
                className="ml-4"
                variant="default"
                onClick={handleBatchPayOut}
                disabled={selectedItems.length === 0 || !isWalletConnected || isPaying}
              >
                {`${isPaying ? 'Paying...' : 'Manual Payment'} (${selectedItems.length})`}
              </Button>
            )}
            {privateKeyConnected && !connected && (
              <>
                <WorkAutoButton
                  isActive={isAutoPaying}
                  onToggle={handleAutoPayOut}
                  startLabel="Auto Payment"
                  stopLabel="Stop Payment"
                  disabled={isPaying}
                />
              </>
            )}
            {!isWalletConnected && (
              <Tooltip>
                <TooltipTrigger asChild onClick={unlockOrders}>
                  <IconHelp className="h-5 w-5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Please connect wallet first and select payment addresses</p>
                </TooltipContent>
              </Tooltip>
            )}
            {!(privateKeyConnected || connected) && (
              <div className="flex items-center gap-4">
                <WalletConnectionByAddress />
                <div className="h-4 w-px bg-border" />
                <WalletConnection />
              </div>
            )}
          </CardTitle>
          <CardDescription>Select payment orders for batch processing with ease</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentDataTable
            ref={paymentDataTableRef}
            onSelectionChange={handleTableSelectionChange}
          />
        </CardContent>
      </Card>
      <PayoutHistory />
    </div>
  );
}
