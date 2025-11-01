import { IconUserCircle, IconLogout } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { Button } from '@/components/ui/button';
import { WalletConnection } from '@/components/ui/wallet-connection';
import { WalletConnectionByAddress } from '@/components/private-wallet';
import { KeystoreWalletButton } from '@/components/keystore-wallet-button';
import { usePrivateKeyConnection } from '@/hooks/use-private-key-connection';
import { Separator } from '@/components/ui/separator';
import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { useWebSocketService } from '@/services/ws';
import { ChainSelect } from '@/components/chain-select';
import { useAuthStore } from '@/stores/auth-store';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useOrderStore } from '@/stores/order-store';

export function MobileMenuContent() {
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
}
