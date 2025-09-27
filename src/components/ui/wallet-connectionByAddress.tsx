import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  IconCoins,
  IconCurrencyDollar,
  IconCopy,
  IconLogout,
  IconRefresh,
  IconKey,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { USDT_CONTRACT_ADDRESSES } from '@/config/constants';
import { truncateFromSun } from '@/lib/utils';
import { getTronWebInstance } from '@/utils/tronweb-manager';
import { privateKeyManager } from '@/services/PrivateKeyManager';
import { useMerchantStore } from '@/stores/merchant-store';
//  Private Key Input Dialog
function PrivateKeyInputDialog({
  isOpen,
  onClose,
  onConnect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (privateKey: string, address: string) => void;
}) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(true);

  const handleConnect = async () => {
    if (!privateKey.trim()) {
      setError('Please enter the private key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // remove 0x prefix and space
      const cleanPrivateKey = privateKey.trim().replace(/^0x/i, '').replace(/\s/g, '');

      // validate private key format
      if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivateKey)) {
        setError('Private key format is invalid, please enter 64-bit hexadecimal characters');
        return;
      }

      // generate address from private key
      const tronWeb = getTronWebInstance('nile');
      const address = tronWeb.address.fromPrivateKey(cleanPrivateKey);

      if (!address) {
        setError('Cannot generate valid address from private key');
        return;
      }

      // call connect callback
      onConnect(cleanPrivateKey, address);
      setPrivateKey('');
      onClose();
    } catch (error) {
      console.error('Private key validation failed:', error);
      setError('Private key validation failed, please check your input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconKey className="h-5 w-5" />
            Enter Private Key to Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Please enter your private key to connect wallet. The private key will be securely stored
            in memory and automatically cleared when you close or refresh the page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="privateKey" className="text-sm font-medium">
              Private Key
            </label>
            <div className="relative">
              <Input
                id="privateKey"
                type={showPrivateKey ? 'text' : 'password'}
                placeholder="Enter 64-bit hexadecimal private key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                onKeyPress={handleKeyPress}
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? (
                  <IconEyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <IconEye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Custom Wallet Select Button
function CustomWalletSelectButton({ onClick }: { onClick: (e?: React.MouseEvent) => void }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
    >
      <IconKey className="h-4 w-4 text-white" />
      Private Wallet
    </Button>
  );
}

// Wallet Connection Component
export function WalletConnectionByAddress() {
  const [trxBalance, setTrxBalance] = useState('');
  const [usdtBalance, setUsdtBalance] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPrivateKeyDialog, setShowPrivateKeyDialog] = useState(false);
  const { stopAutoPaying } = useMerchantStore();
  // Private Key Connection Status
  const [privateKeyConnected, setPrivateKeyConnected] = useState(false);
  const [privateKeyAddress, setPrivateKeyAddress] = useState('');

  // Check Private Key Data in Memory
  useEffect(() => {
    const connectionInfo = privateKeyManager.getConnectionInfo();
    if (connectionInfo.isConnected && connectionInfo.address) {
      setPrivateKeyAddress(connectionInfo.address);
      setPrivateKeyConnected(true);
    }

    // Add Event Listener to Listen for Status Changes
    const handleConnected = (data: any) => {
      if (data && data.address) {
        setPrivateKeyAddress(data.address);
        setPrivateKeyConnected(true);
      }
    };

    const handleDisconnected = () => {
      setPrivateKeyAddress('');
      setPrivateKeyConnected(false);
    };

    // Register Event Listener
    privateKeyManager.addEventListener('connected', handleConnected);
    privateKeyManager.addEventListener('disconnected', handleDisconnected);

    // Clean Event Listener
    return () => {
      privateKeyManager.removeEventListener('connected', handleConnected);
      privateKeyManager.removeEventListener('disconnected', handleDisconnected);
    };
  }, []);

  // Address Truncation Function
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy Address Function
  const copyAddress = async () => {
    const targetAddress = privateKeyConnected ? privateKeyAddress : '';
    if (targetAddress) {
      try {
        await navigator.clipboard.writeText(targetAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // Refresh Balance Function
  const refreshBalances = useCallback(async () => {
    if (!window.tronWeb || !privateKeyConnected) {
      setTrxBalance('');
      setUsdtBalance('');
      return;
    }

    setIsRefreshing(true);
    try {
      const tronWeb = getTronWebInstance('nile');
      const targetAddress = privateKeyConnected ? privateKeyAddress : '';

      if (!targetAddress) {
        setTrxBalance('');
        setUsdtBalance('');
        return;
      }
      // Get TRX Balance
      const trx = await tronWeb.trx.getBalance(targetAddress);
      setTrxBalance(truncateFromSun(trx, 4));
      // Get USDT Balance
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESSES.nile);
      // Set owner_address for contract calls
      tronWeb.setAddress(targetAddress);
      const usdt = await usdtContract.balanceOf(targetAddress).call();

      setUsdtBalance(truncateFromSun(usdt, 4));
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [privateKeyConnected, privateKeyAddress]);

  // Initialize Balance and Listen for Balance Changes
  useEffect(() => {
    refreshBalances();
  }, [privateKeyConnected, privateKeyAddress, refreshBalances]);

  // Handle Private Key Connection
  const handlePrivateKeyConnect = (privateKey: string, address: string) => {
    // Save to Memory
    privateKeyManager.storePrivateKey(privateKey, address);

    setPrivateKeyAddress(address);
    setPrivateKeyConnected(true);
  };

  // Disconnect Private Key
  const handleDisconnectPrivateKey = () => {
    privateKeyManager.clearPrivateKey();
    setPrivateKeyAddress('');
    setPrivateKeyConnected(false);
    setTrxBalance('');
    setUsdtBalance('');
    stopAutoPaying();
  };

  // Get Current Connection Status
  const isConnected = privateKeyConnected;
  const currentAddress = privateKeyConnected ? privateKeyAddress : '';

  return (
    <>
      {isConnected ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <IconKey className="h-4 w-4" />
              {truncateAddress(currentAddress || '')}
              {privateKeyConnected && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                  Private Key
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={copyAddress} className="flex items-center gap-2">
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
                refreshBalances();
              }}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Balance'}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleDisconnectPrivateKey}
              className="flex items-center gap-2 text-red-600 focus:!text-red-500 hover:!text-red-500"
            >
              <IconLogout className="h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <CustomWalletSelectButton
            onClick={() => {
              setShowPrivateKeyDialog(true);
            }}
          />
        </div>
      )}

      <PrivateKeyInputDialog
        isOpen={showPrivateKeyDialog}
        onClose={() => setShowPrivateKeyDialog(false)}
        onConnect={handlePrivateKeyConnect}
      />
    </>
  );
}
