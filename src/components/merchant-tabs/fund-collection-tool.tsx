import { useEffect, useMemo, useState, useRef } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Input } from '@/components/ui/input';
import { LatestUncollectedAddresses } from './latest-uncollected-addresses';
import { CollectionHistory } from './collection-history';
import { useMerchantStore } from '@/stores/merchant-store';
import { useOrderStore } from '@/stores/order-store';
import { useAuthStore } from '@/stores';
import { useWalletStore } from '@/stores/wallet-store';

import { useCollectionAddressInfo } from '@/hooks/use-collection-address-info';
import { WorkAutoButton } from '@/components/customerUI';
import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconHelp } from '@tabler/icons-react';
import { formatNumber } from '@/utils';
import { getBip32Instance } from '@/utils/bip32-utils';
import { LatestRechargeAddresses } from './latest-recharge-addresses';
import { CollectionManager } from '@/services/CollectionManager';
import { useShallow } from 'zustand/react/shallow';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { useWebSocketService } from '@/services/ws/hooks';
import { KeystoreWalletButton } from '@/components/keystore-wallet-button';
import { useWebSocketContext } from '@/contexts/WebSocketProvider';
export function FundCollectionTool() {
  const [bip32, setBip32] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);

  const { isWalletImported, keystore_id } = useWalletStore(
    useShallow((state) => ({
      isWalletImported: state.isWalletImported,
      keystore_id: state.keystore_id,
    }))
  );
  const { connectionStatus } = useWebSocketContext();
  const { isAdmin, profileData } = useAuthStore(
    useShallow((state) => ({
      isAdmin: state.isAdmin,
      profileData: state.profileData,
    }))
  );
  useEffect(() => {
    if (connectionStatus == 'disconnected' || !isAdmin) {
      if (isCollecting) {
        cancelCollecting();
      }
    }
  }, [connectionStatus, isAdmin]);
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

  const { ws } = useWebSocketService();

  const payinStats = useOrderStore(useShallow((state) => state.getPayinStats()));

  const { isCollecting, startCollecting, cancelCollecting, minBalance, setMinBalance } =
    useMerchantStore(
      useShallow((state) => ({
        isCollecting: state.isCollecting,
        startCollecting: state.startCollecting,
        cancelCollecting: state.cancelCollecting,
        minBalance: state.minBalance,
        setMinBalance: state.setMinBalance,
      }))
    );

  const curCollectionAddressInfo = useCollectionAddressInfo();
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);
  const payinOrders = useOrderStore((state) => state.payinOrders);

  useEffect(() => {
    if (bip32 && curCollectionAddressInfo.collection_address) {
      collectionManagerRef.current = CollectionManager.getInstance(
        curCollectionAddressInfo.collection_address,
        bip32
      );
    }
  }, [bip32, curCollectionAddressInfo.collection_address]);

  const handleStartCollection = async () => {
    try {
      if (isCollecting) {
        if (collectionManagerRef.current) {
          collectionManagerRef.current.stopAuto();
          collectionManagerRef.current.reset();
        }
        cancelCollecting();
      } else {
        await startCollecting();
        setTimeout(() => {
          if (collectionManagerRef.current) {
            collectionManagerRef.current.startAuto();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Start collection failed:', error);
      if (isCollecting) {
        cancelCollecting();
        if (collectionManagerRef.current) {
          collectionManagerRef.current.stopAuto();
          collectionManagerRef.current.reset();
        }
      }
    }
  };

  const isValidKeystore = useMemo(() => {
    return profileData?.keystore_id === keystore_id;
  }, [profileData, keystore_id]);

  useEffect(() => {
    const isValidKeystore = profileData?.keystore_id === keystore_id;
    const isWalletReady =
      isWalletImported &&
      isValidKeystore &&
      curChainConfig.chain &&
      curCollectionAddressInfo.collection_address;

    if (!isWalletReady) {
      if (isCollecting) {
        cancelCollecting();
      }
      return;
    }
  }, [
    isCollecting,
    isWalletImported,
    isValidKeystore,
    curChainConfig.chain,
    curCollectionAddressInfo.collection_address,
    profileData,
    keystore_id,
  ]);

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
      <div className="flex items-start gap-6">
        <div>
          <p className="text-muted-foreground">Collect scattered funds to specified address</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-start gap-2  flex-col md:flex-row md:items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="min-balance">When address balance exceeds</label>
            <Input
              id="min-balance"
              type="number"
              value={minBalance.toString()}
              onChange={(e) => {
                setMinBalance(Number(e.target.value));
              }}
              onBlur={(e) => setMinBalance(Number(e.target.value || '0'))}
              className="w-20 min-w-25"
              min="0"
              max="100"
            />
            <p>USDT</p>
          </div>
          <div className="flex items-center gap-1 ">
            <div>Auto collect to:</div>
            {curCollectionAddressInfo.collection_address && (
              <TRC20AddressDisplay
                address={curCollectionAddressInfo.collection_address}
                copyButtonSize="md"
                className="text-blue-800 font-mono  [&>span]:hover:text-blue-600"
              />
            )}
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              {isWalletImported && (
                <WorkAutoButton
                  isActive={isCollecting}
                  onToggle={handleStartCollection}
                  startLabel="Auto Collection"
                  stopLabel="Stop Auto Collection"
                  disabled={
                    !(
                      isWalletImported &&
                      isValidKeystore &&
                      curChainConfig.chain &&
                      curCollectionAddressInfo.collection_address &&
                      ws.isConnected()
                    )
                  }
                />
              )}
              {!isWalletImported && (
                <KeystoreWalletButton className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 hover:text-white" />
              )}
            </div>
            {!isWalletImported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconHelp className="h-5 w-5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Please import Keystore wallet file first</p>
                  <p>Click "Import Keystore" button in the top right corner</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <StatCard
          title={`Uncollected orders`}
          value={formatNumber(payinStats.totalCount)}
          color="blue"
        />
        <StatCard
          title={`Uncollected amount (USDT)`}
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
