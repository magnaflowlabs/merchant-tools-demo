import { IconLogout, IconUserCircle, IconSwitch, IconChevronDown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WalletConnection } from '@/components/ui/wallet-connection';
import { WalletConnectionByAddress } from '@/components/private-wallet';
import { KeystoreWalletButton } from '@/components/keystore-wallet-button';
import { usePrivateKeyConnection } from '@/hooks/use-private-key-connection';
import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { useWebSocketService } from '@/services/ws';
import { ChainSelect } from '@/components/chain-select';
import { useAuthStore } from '@/stores/auth-store';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useOrderStore } from '@/stores/order-store';

export function DesktopNav() {
  const { ws } = useWebSocketService();
  const logout = useAuthStore((state) => state.logout);
  const { connected } = useWallet();
  const navigate = useNavigate();
  const [wsConfig, setWsConfig] = useAtom(wsStoreAtom);
  const clearAllStatus = usePayinOrderStatusStore((state) => state.clearAllStatus);
  const clearAllOrders = useOrderStore((state) => state.clearAllOrders);
  const { connectionInfo } = usePrivateKeyConnection();

  const handleLogout = () => {
    clearAllStatus();
    clearAllOrders();
    logout();
    setWsConfig({ ...wsConfig, token: '' });
    ws.disconnect();
    navigate('/login');
  };

  return (
    <div className="flex items-center gap-4">
      <ChainSelect />

      {!connectionInfo.isConnected && !connected && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground"
            >
              <IconSwitch className="h-4 w-4" />
              <span className="text-sm font-medium">ConnectType</span>
              <IconChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto">
            <div className="p-2">
              <WalletConnectionByAddress />
            </div>
            <DropdownMenuItem>
              <WalletConnection />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {connectionInfo.isConnected && <WalletConnectionByAddress />}

      {connected && <WalletConnection />}
      <div className="h-4 w-px bg-border" />
      <KeystoreWalletButton />

      <div className="h-4 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground"
          >
            <IconUserCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{wsConfig?.user?.username || 'unknown'}</span>
            <IconChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto">
          <DropdownMenuItem onClick={handleLogout}>
            <IconLogout className="h-4 w-4" />
            <span className="text-sm">Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
