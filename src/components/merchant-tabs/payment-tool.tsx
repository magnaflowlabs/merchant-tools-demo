import { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { IconX } from '@tabler/icons-react';
import { PaymentDataTable } from './payment-data-table';
import type { PaymentDataTableRef } from './payment-data-table';
import { PayoutHistory } from './payout-history';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkAutoButton } from '@/components/customerUI';
import { PayoutOrderStatus } from '@/stores/order-store';
import { IconHelp } from '@tabler/icons-react';
import { useMerchantStore } from '@/stores/merchant-store';
import { useOrderStore } from '@/stores/order-store';
import BigNumber from 'bignumber.js';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { merchantLockPayoutOrder } from '@/services/ws/api';
import { useWebSocketService } from '@/services/ws';
import { formatNumber } from '@/utils';
import { payout_new_abi } from '@/constants/payout_abi_v2';
import { stringToBytes32 } from '@/utils/bytes32-utils';
import { usePrivateKeyConnection } from '@/hooks/use-private-key-connection';
import { getTronWebInstance } from '@/utils/tronweb-manager';
import { toast } from 'sonner';
import { TronWeb } from 'tronweb';
import { useChainConfigStore } from '@/stores/chain-config-store';
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
  const { user, cur_chain } = useAuthStore();
  const { chainConfigs } = useChainConfigStore();
  const {
    isPaying: merchantIsPaying,
    isAutoPaying,
    error,
    clearError,
    startAutoPaying,
    stopAutoPaying,
  } = useMerchantStore();
  const { payoutOrders, getSelectedPayoutOrders, updatePayoutOrdersStatus, selectAllPayoutOrders } =
    useOrderStore();

  const { ws } = useWebSocketService();
  const isWalletConnected = connected || privateKeyConnected;
  const currentAddress = address || publicKeyAddress;
  const curUsdtContractAddress = useMemo(() => {
    const curChain = chainConfigs.find((config) => config.chain === cur_chain.chain);
    return curChain?.tokens?.find((token) => token.name === 'usdt')?.contract_addr;
  }, [chainConfigs, cur_chain.chain]);

  // Common payment processing logic
  const processPaymentOrders = async (
    orders: any[],
    isAutoMode: boolean = false
  ): Promise<{ success: boolean; message?: string; txHash?: string }> => {
    if (orders.length === 0) {
      throw new Error('No orders to process');
    }

    if (!ws.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    // Lock orders
    const orderIdentifiers = orders.map((order) => order.bill_no);
    const lockResp = await merchantLockPayoutOrder(orderIdentifiers, cur_chain.chain);
    let validAddresByLockedApi: string[] = [];
    if (lockResp.code === 200 && lockResp.data) {
      validAddresByLockedApi = lockResp.data?.prefixies || [];
    }
    if (validAddresByLockedApi?.length === 0) {
      throw new Error("Current selected orders's is locked, please try again later");
    }

    // Filter and transform orders
    const selectedOrdersFiltered = orders.filter((order) =>
      validAddresByLockedApi.includes(order.bill_no)
    );
    const selectedOrdersNew: { billNo: string; to: string; amount: number }[] =
      selectedOrdersFiltered.map((order) => {
        return {
          billNo: order.bill_no,
          to: order.to,
          amount: Math.floor(parseFloat(String(order.amount)) * 1e6),
        };
      });

    if (!isWalletConnected) {
      throw new Error('Please connect wallet first');
    }

    // Update status to processing
    updatePayoutOrdersStatus(validAddresByLockedApi, { status: PayoutOrderStatus.Processing });

    // Setup TronWeb
    let tronweb = window.tronWeb;

    if (privateKeyConnected && !connected) {
      const privateKey = getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found');
      }

      tronweb = getTronWebInstance('nile');
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

    // Validate current address format
    if (!tronweb.isAddress(currentAddress)) {
      throw new Error(`Invalid wallet address format: ${currentAddress}`);
    }

    if (!user?.merchant_id) {
      throw new Error('Merchant ID not found');
    }

    // Setup contracts
    const contract = await tronweb.contract().at(curUsdtContractAddress);
    const contract2 = tronweb.contract(payout_new_abi, cur_chain.payout_contract_address);

    // Get allowance and calculate fees
    const getAllowance = await contract
      .allowance(currentAddress, cur_chain.payout_contract_address)
      .call();
    const totalAmount = orders.reduce((acc, cur) => BigNumber(acc).plus(cur.amount).toNumber(), 0);
    const totalAmountInWei = TronWeb.toSun(totalAmount);
    const getTotalFeeForOrders = await contract2
      .getTotalFeeFor(
        curUsdtContractAddress,
        validAddresByLockedApi.length,
        BigNumber(totalAmountInWei).toNumber(),
        currentAddress
      )
      .call();

    // Approve if needed
    if (
      BigNumber(getAllowance.toString()).lt(BigNumber(totalAmountInWei).plus(getTotalFeeForOrders))
    ) {
      const approveAmount = BigNumber(totalAmountInWei).plus(getTotalFeeForOrders).toString();
      const hash = await contract
        .approve(cur_chain.payout_contract_address, approveAmount)
        .send(isAutoMode ? { feeLimit: 1000000000 } : {});

      // For auto mode, wait for approval confirmation
      if (isAutoMode) {
        let data: any;
        while (true) {
          data = await tronweb.trx.getTransactionInfo(hash);
          if (data && data.receipt) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (data && data.receipt && data.receipt.result != 'SUCCESS') {
          throw new Error('Approval transaction failed');
        }
      }
    }

    // Create orders array with validation
    const ordersArray: [string, string, number][] = selectedOrdersNew.map((item) => {
      if (!item.to || item.to.trim() === '') {
        throw new Error(`Invalid target address for bill ${item.billNo}: address is empty`);
      }
      if (!item.billNo || item.billNo.trim() === '') {
        throw new Error(`Invalid bill number: billNo is empty`);
      }
      if (item.amount <= 0) {
        throw new Error(`Invalid amount for bill ${item.billNo}: amount must be greater than 0`);
      }

      return [stringToBytes32(item.billNo), item.to, item.amount];
    });

    // Execute batch transfer
    const merchantIdBytes32 = stringToBytes32(user?.merchant_id);
    const result = await contract2
      .batchTransfer(merchantIdBytes32, curUsdtContractAddress, ordersArray, false)
      .send(isAutoMode ? { feeLimit: 1000000000 } : {});

    if (result) {
      updatePayoutOrdersStatus(validAddresByLockedApi, {
        status: PayoutOrderStatus.Confirming,
        txHash: result,
        isLocked: true,
      });
      selectAllPayoutOrders(false);
      return {
        success: true,
        message: 'Payment successful',
        txHash: result,
      };
    } else {
      updatePayoutOrdersStatus(validAddresByLockedApi, { status: PayoutOrderStatus.Pending });
      throw new Error('Transaction broadcast failed, but no specific reason was provided.');
    }
  };

  const handleBatchPayOut = async () => {
    if (selectedItems.length === 0) {
      toast.warning('Please select orders first');
      return;
    }
    setIsPaying(true);
    try {
      const selectedOrders = getSelectedPayoutOrders();
      if (selectedOrders.length === 0) {
        throw new Error('No selected orders data found');
      }

      try {
        const result = await processPaymentOrders(selectedOrders, false);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          console.error('Payment failed:', error);
        }
        throw error;
      }
    } catch (error) {
      // Handle batch payment error
    } finally {
      setIsPaying(false);
    }
  };

  const handleAutoPayOut = async () => {
    if (!privateKeyConnected || connected) {
      throw new Error('Auto payment is only available for private key wallet');
    }

    if (isAutoPaying) {
      stopAutoPaying();
      return;
    }

    startAutoPaying();

    try {
      // Auto payment logic - continuously process pending orders
      const processPendingOrders = async () => {
        let isWorking = false;
        while (true) {
          if (isWorking) {
            continue;
          }
          // Check if auto paying is still enabled at the start of each iteration
          const { isAutoPaying: currentAutoPaying } = useMerchantStore.getState();
          if (!currentAutoPaying) {
            break;
          }
          // Get fresh payoutOrders data from store on each iteration
          const { payoutOrders: currentPayoutOrders } = useOrderStore.getState();
          const pendingOrders = Array.from(currentPayoutOrders.values()).filter(
            (order) => order.status === PayoutOrderStatus.Pending
          );

          if (pendingOrders.length === 0) {
            // No pending orders, wait a bit before checking again
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
          }

          // Process the batch payment
          try {
            isWorking = true;
            await processPaymentOrders(pendingOrders, true);
          } catch (error) {
            console.error('Auto payment batch failed:', error);
            // Continue processing other orders even if one batch fails
          } finally {
            isWorking = false;
          }
          // Wait before processing next batch
          await new Promise((resolve) => setTimeout(resolve, 5000));
          // Additional check to ensure we're still in auto-pay mode
          const { isAutoPaying: stillAutoPaying } = useMerchantStore.getState();
          if (!stillAutoPaying) {
            break;
          }
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconX className="h-4 w-4 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Payment Tool</h2>
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
        <StatCard title={`Unpaid Orders`} value={Number(payoutOrders.size)} color="blue" />
        <StatCard
          title={`Unpaid Amount (USDT)`}
          value={formatNumber(
            Array.from(payoutOrders.values()).reduce(
              (acc, order) => BigNumber(acc).plus(order.amount).toNumber(),
              0
            )
          )}
          color="green"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Payment Data
            <Button
              className="ml-4"
              variant="default"
              onClick={handleBatchPayOut}
              disabled={selectedItems.length === 0 || !isWalletConnected}
            >
              {`${isPaying ? 'Paying...' : 'Manual Payment'} (${selectedItems.length})`}
            </Button>
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
                <TooltipTrigger asChild>
                  <IconHelp className="h-5 w-5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Please connect wallet first and select payment addresses</p>
                </TooltipContent>
              </Tooltip>
            )}
          </CardTitle>
          <CardDescription>
            Select payment orders to process, supports batch operations
          </CardDescription>
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
