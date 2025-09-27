import { useEffect, useMemo, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { IconX } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { LatestUncollectedAddresses } from './latest-uncollected-addresses';
import { CollectionHistory } from './collection-history';
import { useMerchantStore } from '@/stores/merchant-store';
import { useOrderStore } from '@/stores/order-store';
import { useAuthStore } from '@/stores';
import { useOrderData } from '@/hooks/use-order-data';
import { useWalletStore } from '@/stores/wallet-store';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { WorkAutoButton } from '@/components/customerUI';
import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconHelp } from '@tabler/icons-react';
import { formatNumber } from '@/utils';
import { getBip32Instance } from '@/utils/bip32-utils';
import { LatestRechargeAddresses } from './latest-recharge-addresses';
import { CollectionManager } from '@/services/CollectionManager';

export function FundCollectionTool() {
  const [bip32, setBip32] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isWalletImported, keystore_id } = useWalletStore();

  const collectionManagerRef = useRef<CollectionManager | null>(null);

  useEffect(() => {
    const initBip32 = async () => {
      try {
        const bip32Instance = await getBip32Instance();
        setBip32(bip32Instance);
      } catch (error) {
        console.error('Initialize BIP32 failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initBip32();
  }, []);

  const payinOrderStatusStore = usePayinOrderStatusStore();
  const { payinStats } = useOrderData();

  const {
    isCollecting,
    startCollecting,
    cancelCollecting,
    error,
    clearError,
    minBalance,
    setMinBalance,
  } = useMerchantStore();

  const { user, cur_chain } = useAuthStore();
  const { payinOrders } = useOrderStore();

  useEffect(() => {
    if (bip32 && cur_chain.collection_address) {
      collectionManagerRef.current = new CollectionManager(
        cur_chain.collection_address,
        bip32,
        (orderKey, status) => {}
      );
      if (isCollecting && collectionManagerRef.current) {
        collectionManagerRef.current.startAuto();
      }
    }
  }, [bip32, cur_chain.collection_address]);

  const getOrdersToProcess = useMemo(() => {
    if (!collectionManagerRef.current || !payinOrders) return [];

    return collectionManagerRef.current.getOrdersToProcess(payinOrders);
  }, [payinOrders, minBalance]);

  const handleStartCollection = async () => {
    try {
      if (isCollecting) {
        cancelCollecting();

        payinOrderStatusStore.clearAllStatus();
        if (collectionManagerRef.current) {
          collectionManagerRef.current.reset();
        }
      } else {
        await startCollecting();
      }
    } catch (error) {
      console.error('Start collection failed:', error);
    }
  };

  const isValidKeystore = useMemo(() => {
    return user?.keystore_id === keystore_id;
  }, [user?.keystore_id, keystore_id]);

  useEffect(() => {
    const isValidKeystore = user?.keystore_id === keystore_id;
    const isWalletReady =
      isWalletImported && isValidKeystore && cur_chain.chain && cur_chain.collection_address;

    if (!isWalletReady) {
      if (isCollecting) {
        cancelCollecting();
      }
      return;
    }

    if (!collectionManagerRef.current) return;
    if (isCollecting) {
      collectionManagerRef.current.startAuto();
    } else {
      collectionManagerRef.current.stopAuto();
    }
  }, [
    isCollecting,
    isWalletImported,
    isValidKeystore,
    cur_chain.chain,
    cur_chain.collection_address,
    user?.keystore_id,
    keystore_id,
  ]);

  useEffect(() => {
    if (!collectionManagerRef.current) return;
    if (!isCollecting) return;
    const ordersToProcess = getOrdersToProcess;
    if (ordersToProcess.length > 0) {
      collectionManagerRef.current.addToQueue(ordersToProcess);
      void collectionManagerRef.current.processQueue();
    }
  }, [getOrdersToProcess, isCollecting]);
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing encryption module...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Fund Collection Tool</h2>
          <p className="text-muted-foreground">Collect scattered funds to specified address</p>
        </div>
      </div>
      <div className="flex items-start gap-2  flex-col md:flex-row md:items-center flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="min-balance">When address balance above</label>
          <Input
            id="min-balance"
            type="number"
            value={minBalance.toString()}
            onChange={(e) => {
              setMinBalance(Number(e.target.value));
            }}
            onBlur={(e) => setMinBalance(Number(e.target.value || '1'))}
            className="w-20 min-w-25"
            min="1"
            max="100"
          />
          <p>USDT</p>
        </div>
        <div className="flex items-center gap-1 ">
          <div>Auto collect to:</div>
          {cur_chain.collection_address && (
            <TRC20AddressDisplay
              address={cur_chain.collection_address}
              showCopyButton={true}
              copyButtonSize="md"
              className="text-blue-800 font-mono  [&>span]:hover:text-blue-600"
            />
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <WorkAutoButton
              isActive={isCollecting}
              onToggle={handleStartCollection}
              startLabel="Auto Collection"
              stopLabel="Stop Auto Collection"
              disabled={
                !(
                  isWalletImported &&
                  isValidKeystore &&
                  cur_chain.chain &&
                  cur_chain.collection_address
                )
              }
            />
          </div>
          {!isWalletImported && (
            <Tooltip>
              <TooltipTrigger asChild>
                <IconHelp className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Please import Keystore wallet file first</p>
                <p>Click "Import Keystore File" button in the top right corner</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <StatCard
          title={`Uncollected Orders`}
          value={formatNumber(payinStats.totalCount)}
          color="blue"
        />
        <StatCard
          title={`Uncollected Amount (USDT)`}
          value={formatNumber(payinStats.totalValue)}
          color="green"
        />
      </div>
      <LatestUncollectedAddresses />

      <LatestRechargeAddresses />

      <CollectionHistory />
    </div>
  );
}
