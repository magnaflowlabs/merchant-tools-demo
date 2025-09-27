import {
  IconLogout,
  IconUserCircle,
  IconSwitch,
  IconChevronDown,
  IconMenu2,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WalletConnection } from '@/components/ui/wallet-connection';
import { WalletConnectionByAddress } from '@/components/ui/wallet-connectionByAddress';
import { KeystoreWalletButton } from '@/components/keystore-wallet-button';
import { usePrivateKeyConnection } from '@/hooks/use-private-key-connection';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { useWebSocketService } from '@/services/ws';
import { ChainSelect } from '@/components/chain-select';
import { useAuthStore } from '@/stores/auth-store';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useOrderStore } from '@/stores/order-store';
export function NavUser() {
  const { ws } = useWebSocketService();
  const { logout } = useAuthStore();
  const { connected } = useWallet();
  const navigate = useNavigate();
  const [wsConfig, setWsConfig] = useAtom(wsStoreAtom);
  const payinOrderStatusStore = usePayinOrderStatusStore();
  const isMobile = useIsMobile();
  const { clearAllOrders } = useOrderStore();
  const { connectionInfo } = usePrivateKeyConnection();
  const handleLogout = () => {
    payinOrderStatusStore.clearAllStatus();
    clearAllOrders();
    logout();
    setWsConfig({ ...wsConfig, token: '' });
    ws.disconnect();
    navigate('/login');
  };

  const MobileMenuContent = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <IconUserCircle className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">{wsConfig?.user?.username || 'unknown'}</p>
          <p className="text-sm text-muted-foreground">User</p>
        </div>
      </div>
      <Separator />
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Chian Select</h3>
        <ChainSelect />
        <Separator />
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Wallet Connection</h3>

        {!connectionInfo.isConnected && !connected && (
          <div className="space-y-2">
            <WalletConnectionByAddress />
            <WalletConnection />
          </div>
        )}

        {connectionInfo.isConnected && <WalletConnectionByAddress />}
        {connected && <WalletConnection />}
      </div>
      <Separator />
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Keystore Wallet</h3>
        <KeystoreWalletButton />
      </div>

      <Separator />
      <Button variant="destructive" onClick={handleLogout} className="w-full justify-start">
        <IconLogout className="h-4 w-4 mr-2" />
        Log Out
      </Button>
    </div>
  );

  const DesktopNav = () => (
    <div className="flex items-center gap-4">
      {/* chain select */}
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
              <span className="text-sm font-medium">{'ConnectType'}</span>
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

  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground"
        >
          <IconMenu2 className="h-5 w-5" />
          <IconUserCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>User</SheetTitle>
        </SheetHeader>
        <MobileMenuContent />
      </SheetContent>
    </Sheet>
  );

  return <>{isMobile ? <MobileNav /> : <DesktopNav />}</>;
}
