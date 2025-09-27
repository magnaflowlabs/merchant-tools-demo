import React, { useState, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { multiChainConfig } from '@/config/constants';
import { useAuthStore } from '@/stores/auth-store';
import { useChainConfigStore, useAppStore } from '@/stores';
import { cn } from '@/lib/utils';
import { useMerchantStore } from '@/stores/merchant-store';
import { useSyncConfigStore } from '@/stores/sync-config-store';
import { useOrderStore } from '@/stores/order-store';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

const CHAIN_COLORS = {
  trx: 'from-blue-500/20 to-blue-600/40',
  trx_nil: 'from-purple-500/20 to-purple-600/40',
  eth: 'from-gray-500/20 to-gray-600/40',
  default: 'from-primary/20 to-primary/40',
} as const;

interface ChainSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function useChainSelection() {
  const { user, cur_chain, setCurChain } = useAuthStore();

  const { setCurChain: setSelectedChain } = useAppStore();
  const payinOrderStatusStore = usePayinOrderStatusStore();
  const { isCollecting, cancelCollecting } = useMerchantStore();
  const { isSyncingAddress, setIsSyncingAddress } = useSyncConfigStore();
  const { clearAllOrders } = useOrderStore();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChainValue, setPendingChainValue] = useState<string>('');

  const getChainConfig = useCallback(
    (chainValue: string) => {
      if (!user?.collection_addresses?.length) {
        console.warn('No collection addresses available for user');
        return {
          chain: chainValue,
          collection_address: '',
          payout_contract_address: '',
          payout_contract_version: '',
        };
      }

      const chainAddress = user.collection_addresses.find((addr) => addr.chain === chainValue);
      if (!chainAddress) {
        console.warn(`No address configuration found for chain: ${chainValue}`);
      }

      return {
        chain: chainValue,
        collection_address: chainAddress?.collection_address || '',
        payout_contract_address: chainAddress?.payout_contract_address || '',
        payout_contract_version: chainAddress?.payout_contract_version || '',
      };
    },
    [user?.collection_addresses]
  );

  const performChainChange = useCallback(
    (value: string) => {
      try {
        const chainConfig = getChainConfig(value);
        setCurChain(chainConfig);
        setSelectedChain(value);
        clearAllOrders();

        payinOrderStatusStore.clearAllStatus();
      } catch (error) {
        console.error('Failed to perform chain change:', error);
      }
    },
    [getChainConfig, setCurChain, setSelectedChain, clearAllOrders]
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
    cur_chain,
    showConfirmDialog,
    pendingChainValue,
    handleChainChange,
    handleConfirmChange,
    handleCancelChange,
  };
}

interface ChainSelectItemProps {
  chainConfig: (typeof multiChainConfig)[0] | any;
  index: number;
  getChainColor: (chain: string) => string;
}

const ChainSelectItem = React.memo<ChainSelectItemProps>(
  ({ chainConfig, index, getChainColor }) => (
    <SelectItem
      key={chainConfig.chain}
      value={chainConfig.chain}
      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:shadow-sm focus:bg-accent/50 focus:shadow-sm data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:border data-[state=checked]:border-primary/20 data-[state=checked]:shadow-sm animate-in slide-in-from-left-2 fade-in-0 [&>span:first-child]:hidden"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3 w-full">
        <div
          className={cn(
            'w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-semibold text-white shadow-sm',
            getChainColor(chainConfig.chain)
          )}
        >
          {(chainConfig.chain_name || chainConfig.name || chainConfig.chain).charAt(0)}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium leading-tight">
            {chainConfig.chain_name || chainConfig.name || chainConfig.chain}
          </span>
        </div>
      </div>

      <div className="absolute right-3 opacity-0 group-data-[state=checked]:opacity-100 transition-all duration-200 transform scale-75 group-data-[state=checked]:scale-100">
        <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
        </div>
      </div>
    </SelectItem>
  )
);

ChainSelectItem.displayName = 'ChainSelectItem';

export function ChainSelect({
  placeholder = 'Select Chain1',
  className,
  disabled = false,
}: ChainSelectProps) {
  const { user } = useAuthStore();
  const { chainConfigs } = useChainConfigStore();
  const { isCollecting } = useMerchantStore();
  const { isSyncingAddress } = useSyncConfigStore();
  const {
    cur_chain,
    showConfirmDialog,
    handleChainChange,
    handleConfirmChange,
    handleCancelChange,
  } = useChainSelection();
  const availableChains = useMemo(() => {
    if (chainConfigs.length > 0) {
      return chainConfigs;
    }

    if (!user?.collection_addresses?.length) {
      return [];
    }

    const userChains = new Set(user.collection_addresses.map((addr) => addr.chain));
    return multiChainConfig.filter((config) => userChains.has(config.chain));
  }, [chainConfigs, user?.collection_addresses]);

  const getChainColor = useCallback((chain: string) => {
    return CHAIN_COLORS[chain as keyof typeof CHAIN_COLORS] || CHAIN_COLORS.default;
  }, []);

  if (availableChains.length === 0) {
    return null;
  }
  return (
    <>
      <Select value={cur_chain.chain} onValueChange={handleChainChange} disabled={disabled}>
        <SelectTrigger
          className={cn('min-w-[140px] transition-all duration-200 hover:shadow-md ', className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="min-w-[200px] max-h-[300px] p-2 bg-popover/95 backdrop-blur-sm shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="space-y-1">
            {availableChains.map((chainConfig, index) => (
              <ChainSelectItem
                key={chainConfig.chain}
                chainConfig={chainConfig}
                index={index}
                getChainColor={getChainColor}
              />
            ))}
          </div>
        </SelectContent>
      </Select>
      <div className="h-4 w-px bg-border" />

      <Dialog open={showConfirmDialog} onOpenChange={handleCancelChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Chain Switch</DialogTitle>
            <DialogDescription>
              There are currently running tasks:
              {isCollecting && (
                <span className="text-orange-600 font-medium"> Collection Task</span>
              )}
              {isCollecting && isSyncingAddress && <span> and </span>}
              {isSyncingAddress && (
                <span className="text-blue-600 font-medium"> Address Sync Task</span>
              )}
              <br />
              If you continue to switch chains, the current task will be interrupted. Are you sure
              you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelChange}>
              Cancel
            </Button>
            <Button onClick={handleConfirmChange} className="bg-red-600 hover:bg-red-700">
              Confirm Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { ChainSelectProps };
