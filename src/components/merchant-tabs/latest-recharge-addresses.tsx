import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { stringToBytes32 } from '@/utils/bytes32-utils';

import { payout_new_abi } from '@/constants/payout_abi_v2';

import { RechargeDataTable, type CollectionDataTableRef } from './recharge-data-table';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { PayinOrderStatus } from '@/types/merchant';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IconHelp } from '@tabler/icons-react';
import { toast } from 'sonner';
import { getTronWebInstance } from '@/utils/tronweb-manager';
import { useAuthStore } from '@/stores/auth-store';
import { useMerchantStore } from '@/stores/merchant-store';
import { usePrivateKeyConnection } from '@/hooks/use-private-key-connection';
import { WorkAutoButton } from '@/components/customerUI';
export function LatestRechargeAddresses({}) {
  const { connected, address } = useWallet();
  const payinOrderStatusStore = usePayinOrderStatusStore();
  const [localIsCollecting, setLocalIsCollecting] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const tableRef = useRef<CollectionDataTableRef>(null);
  const { chainConfigs } = useChainConfigStore();
  const { user, cur_chain } = useAuthStore();
  const { isAutoTopping, startAutoTopping, stopAutoTopping } = useMerchantStore();
  const {
    isConnected: privateKeyConnected,
    address: publicKeyAddress,
    getPrivateKey,
  } = usePrivateKeyConnection();
  const hasSelectedItems = useCallback(() => {
    return selectedCount > 0;
  }, [selectedCount]);

  // check if there is data
  const hasData = () => {
    return totalCount > 0;
  };

  // start topup button
  const handleStartTopup = async () => {
    if (!hasSelectedItems()) {
      return;
    }
    setLocalIsCollecting(true);

    try {
      // get selected items
      let selectedItems = tableRef.current?.getSelectedItems() || [];
      // only do auto recharge TRX fee

      if (!selectedItems || selectedItems.length === 0) {
        toast.error('Please select the addresses you want to recharge first');
        return;
      }

      selectedItems = selectedItems.filter((item) => {
        const status = payinOrderStatusStore.getOrderStatus(`${item.address}${item.created_at}`);
        if (!status || status === PayinOrderStatus.Pending) {
          return true;
        }
        return false;
      });
      if (!selectedItems || selectedItems.length === 0) {
        toast.error('the selected addresses are confirmed, please select other addresses');
        return;
      }
      const trxValue = 20 * 10 ** 6;
      if (!(connected || privateKeyConnected)) {
        toast.error('You need to connect your wallet first', {
          duration: 1500,
        });
        return;
      }

      // const tronweb = getTronWebInstance('nile');
      let tronweb = window.tronWeb;
      if (!tronweb) {
        throw new Error('Please connect your wallet first');
      }

      if (privateKeyConnected && !connected) {
        const privateKey = getPrivateKey();
        if (!privateKey) {
          throw new Error('Private key not found');
        }

        tronweb = getTronWebInstance('nile');
        tronweb.setPrivateKey(privateKey);
      }

      try {
        // Calculate total amount needed for batch transfer
        const totalAmount = selectedItems.length * trxValue;

        const curChain = chainConfigs.find((config) => config.chain === cur_chain.chain);
        const tokenInfor = curChain?.tokens.find((token) => token.name === 'usdt');
        if (!tokenInfor) {
          throw new Error('Token configuration not found');
        }

        if (!tokenInfor?.contract_addr) {
          throw new Error('Token contract address not found');
        }

        const contract2 = tronweb.contract(payout_new_abi, cur_chain.payout_contract_address);

        // For TRX native token, use zero address
        const TRX_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

        // Format orders array according to contract structure
        const ordersArray: [string, string, number][] = selectedItems.map((item) => {
          return [
            '0x0000000000000000000000000000000000000000000000000000000000000000', // billNo (empty for recharge)
            item.address, // recipient address
            trxValue, // amount in sun (20 TRX = 20 * 10^6 sun)
          ];
        });

        const currentAddress = connected ? address : publicKeyAddress;
        // Get total fee for TRX transfers
        if (!currentAddress) {
          toast.error('Wallet address not found');
          return;
        }
        const getTotalFeeForOrders = await contract2
          .getTotalFeeFor(TRX_TOKEN_ADDRESS, selectedItems.length, totalAmount, currentAddress)
          .call();
        if (!user?.merchant_id) {
          toast.error('Merchant ID not found');
          return;
        }

        const merchantIdBytes32 = stringToBytes32(user.merchant_id);

        // Call batchTransfer with correct TRX token address
        const result = await contract2
          .batchTransfer(
            merchantIdBytes32,
            TRX_TOKEN_ADDRESS, // Use TRX token address (zero address for native TRX)
            ordersArray,
            false // allowPartial
          )
          .send({
            callValue: totalAmount, // Send TRX with the transaction
            feeLimit: 1000000000, // Set appropriate fee limit
          });

        if (result) {
          toast.success(`Batch recharge successful! Transaction ID: ${result.slice(0, 8)}...`);

          // Update order status for each selected item
          selectedItems.forEach((order) => {
            payinOrderStatusStore.setOrderStatus(
              `${order.address}${order.created_at}`,
              PayinOrderStatus.Confirming
            );
          });
        } else {
          throw new Error('Transaction broadcast failed - no transaction ID returned.');
        }
      } catch (error) {
        console.error('Batch transfer failed:', error);

        // Provide more specific error messages
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
            toast.error(`Batch transfer failed: ${error.message}`);
          }
        } else {
          toast.error('Batch transfer failed - unknown error occurred');
        }

        throw error;
      }
    } catch (error) {
      console.error('Topup process failed:', error);

      if (error instanceof Error) {
        toast.error(`Topup failed: ${error.message}`);
      } else {
        toast.error('Topup failed - please try again');
      }
    } finally {
      setLocalIsCollecting(false);
    }
  };

  const canStartTopup = hasData() && hasSelectedItems() && !localIsCollecting;

  // Auto Topup handler
  const handleAutoTopup = async () => {
    if (isAutoTopping) {
      stopAutoTopping();
      return;
    }
    if (!privateKeyConnected || connected) {
      throw new Error('Auto payment is only available for private key wallet');
    }
    if (!privateKeyConnected || !publicKeyAddress) {
      toast.error('You need to connect your wallet first for auto topup', {
        duration: 1500,
      });
      return;
    }

    startAutoTopping();

    try {
      // Auto topup logic - continuously process recharge addresses
      const processRechargeAddresses = async () => {
        while (true) {
          // Check if auto topping is still enabled at the start of each iteration
          const { isAutoTopping: currentAutoTopping } = useMerchantStore.getState();
          if (!currentAutoTopping) {
            break;
          }

          // Get fresh data from table on each iteration
          const rechargeTableData = tableRef.current?.getAllData() || [];

          let selectedRechargeAddresses = rechargeTableData.filter((addr) => {
            // Only process addresses that need recharge (balance < 20 TRX)
            return Number(addr.value) < 20 * 10 ** 6; // 20 TRX in sun
          });

          selectedRechargeAddresses = selectedRechargeAddresses.filter((addr) => {
            return (
              payinOrderStatusStore.getOrderStatus(`${addr.address}${addr.created_at}`) !==
              PayinOrderStatus.Confirming
            );
          });
          if (selectedRechargeAddresses.length === 0) {
            // No addresses need recharge, wait a bit before checking again
            await new Promise((resolve) => setTimeout(resolve, 10000));
            continue;
          }

          // Process the batch topup
          try {
            setLocalIsCollecting(true);

            const trxValue = 20 * 10 ** 6; // 20 TRX in sun

            let tronweb = window.tronWeb;
            if (!tronweb || !privateKeyConnected) {
              throw new Error('Please connect your wallet first');
            }

            if (privateKeyConnected && !connected) {
              const privateKey = getPrivateKey();
              if (!privateKey) {
                throw new Error('Private key not found');
              }

              tronweb = getTronWebInstance('nile');
              tronweb.setPrivateKey(privateKey);
            }

            // try {
            // Calculate total amount needed for batch transfer
            const totalAmount = selectedRechargeAddresses.length * trxValue;

            const curChain = chainConfigs.find((config) => config.chain === cur_chain.chain);
            const tokenInfor = curChain?.tokens.find((token) => token.name === 'usdt');
            if (!tokenInfor) {
              throw new Error('Token configuration not found');
            }

            if (!tokenInfor?.contract_addr) {
              throw new Error('Token contract address not found');
            }

            const contract2 = tronweb.contract(payout_new_abi, cur_chain.payout_contract_address);

            // For TRX native token, use zero address
            const TRX_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

            // Format orders array according to contract structure
            const ordersArray: [string, string, number][] = selectedRechargeAddresses.map(
              (item) => {
                return [
                  '0x0000000000000000000000000000000000000000000000000000000000000000', // billNo (empty for recharge)
                  item.address, // recipient address
                  trxValue, // amount in sun (20 TRX = 20 * 10^6 sun)
                ];
              }
            );

            // Get total fee for TRX transfers
            const getTotalFeeForOrders = await contract2
              .getTotalFeeFor(
                TRX_TOKEN_ADDRESS,
                selectedRechargeAddresses.length,
                totalAmount,
                publicKeyAddress
              )
              .call();

            if (!user?.merchant_id) {
              toast.error('Merchant ID not found');
              return;
            }

            const merchantIdBytes32 = stringToBytes32(user.merchant_id);

            // Call batchTransfer with correct TRX token address
            const result = await contract2
              .batchTransfer(merchantIdBytes32, TRX_TOKEN_ADDRESS, ordersArray, false)
              .send({
                callValue: totalAmount, // Send TRX with the transaction
                feeLimit: 1000000000, // Set appropriate fee limit
              });

            if (result) {
              toast.success(`Auto topup successful! Transaction ID: ${result.slice(0, 8)}...`);

              // Update order status for each selected item
              selectedRechargeAddresses.forEach((order) => {
                payinOrderStatusStore.setOrderStatus(
                  `${order.address}${order.created_at}`,
                  PayinOrderStatus.Confirming
                );
              });
            } else {
              throw new Error('Transaction broadcast failed - no transaction ID returned.');
            }
            // } catch (error) {
            //   console.error('Auto batch transfer failed:', error);

            //   // Provide more specific error messages
            //   // if (error instanceof Error) {
            //   //   if (error.message.includes('insufficient')) {
            //   //     toast.error('Insufficient TRX balance for auto topup');
            //   //   } else if (error.message.includes('energy')) {
            //   //     toast.error('Insufficient energy for auto topup transaction');
            //   //   } else if (error.message.includes('fee')) {
            //   //     toast.error('Auto topup transaction fee calculation failed');
            //   //   } else if (error.message.includes('contract')) {
            //   //     toast.error(
            //   //       'Auto topup contract interaction failed - please check contract address'
            //   //     );
            //   //   } else {
            //   //     toast.error(`Auto topup failed: ${error.message}`);
            //   //   }
            //   // } else {
            //   //   toast.error('Auto topup failed - unknown error occurred');
            //   // }

            //   throw error;
            // }
          } catch (error) {
            console.error('Auto topup process failed:', error);

            if (error instanceof Error) {
              toast.error(`Auto topup failed: ${error.message}`);
            } else {
              toast.error('Auto topup failed - please try again');
            }
            stopAutoTopping();
          } finally {
            setLocalIsCollecting(false);
          }

          // Wait before processing next batch
          await new Promise((resolve) => setTimeout(resolve, 15000));

          // Additional check to ensure we're still in auto-topup mode
          const { isAutoTopping: stillAutoTopping } = useMerchantStore.getState();
          if (!stillAutoTopping) {
            break;
          }
        }
      };

      await processRechargeAddresses();
    } catch (error) {
      console.error('Auto topup error:', error);
      stopAutoTopping();
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Pending Recharge Addresses</CardTitle>
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
          <Button
            className="flex items-center gap-2"
            onClick={handleStartTopup}
            disabled={!canStartTopup}
          >
            {localIsCollecting ? 'Recharge...' : 'Manual Recharge'}
          </Button>
          {privateKeyConnected && !connected && (
            <WorkAutoButton
              isActive={isAutoTopping}
              onToggle={handleAutoTopup}
              startLabel="Auto Recharge"
              stopLabel="Stop Recharge"
              disabled={localIsCollecting}
            />
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
