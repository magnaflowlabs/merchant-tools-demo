import { Button } from '@/components/ui/button';
import {
  IconCoins,
  IconCurrencyDollar,
  IconCopy,
  IconLogout,
  IconRefresh,
  IconKey,
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { truncateAddress } from './utils';

interface WalletDropdownProps {
  address: string;
  trxBalance: string;
  usdtBalance: string;
  copied: boolean;
  isRefreshing: boolean;
  onCopyAddress: () => void;
  onRefreshBalances: () => void;
  onDisconnect: () => void;
  isPrivateKeyConnection?: boolean;
}

export function WalletDropdown({
  address,
  trxBalance,
  usdtBalance,
  copied,
  isRefreshing,
  onCopyAddress,
  onRefreshBalances,
  onDisconnect,
}: WalletDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <IconKey className="h-4 w-4" />
          {truncateAddress(address)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCopyAddress();
          }}
          className="flex items-center gap-2"
        >
          <IconCopy className="h-4 w-4" />
          {copied ? 'Copied!' : 'Copy Address'}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCoins className="h-4 w-4" />
            TRX Balance:
          </div>
          <span className="font-semibold text-blue-600">{trxBalance || '0'}</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCurrencyDollar className="h-4 w-4" />
            USDT Balance:
          </div>
          <span className="font-semibold text-blue-600">{usdtBalance || '0'}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRefreshBalances();
          }}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Balance'}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onDisconnect}
          className="flex items-center gap-2 text-red-600 focus:!text-red-500 hover:!text-red-500"
        >
          <IconLogout className="h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
