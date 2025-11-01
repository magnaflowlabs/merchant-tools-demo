import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChainConfigStore } from '@/stores';
import { cn } from '@/lib/utils';
import { useMerchantStore } from '@/stores/merchant-store';
import { useSyncConfigStore } from '@/stores/sync-config-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChainSelectItem } from './chain-select-item';
import { MIN_SELECT_WIDTH, MIN_CONTENT_WIDTH, MAX_CONTENT_HEIGHT } from './chain-utils';
import { useChainSelection } from './useChainSelection';
import type { ChainSelectProps } from '@/types';

export function ChainSelect({
  placeholder = 'Select Chain',
  className,
  disabled = false,
}: ChainSelectProps) {
  const chainConfigs = useChainConfigStore((state) => state.chainConfigs);
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);
  const isCollecting = useMerchantStore((state) => state.isCollecting);
  const isSyncingAddress = useSyncConfigStore((state) => state.isSyncingAddress);
  const { showConfirmDialog, handleChainChange, handleConfirmChange, handleCancelChange } =
    useChainSelection();
  if (!chainConfigs.length) {
    return null;
  }

  return (
    <>
      <Select value={curChainConfig.chain} onValueChange={handleChainChange} disabled={disabled}>
        <SelectTrigger
          className={cn(MIN_SELECT_WIDTH, 'transition-all duration-200 hover:shadow-md', className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className={cn(
            MIN_CONTENT_WIDTH,
            MAX_CONTENT_HEIGHT,
            'p-2 bg-popover/95 backdrop-blur-sm shadow-xl animate-in fade-in-0 zoom-in-95 duration-200'
          )}
        >
          <div className="space-y-1">
            {chainConfigs.map((chainConfig, index) => (
              <ChainSelectItem key={chainConfig.chain} chainConfig={chainConfig} index={index} />
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
