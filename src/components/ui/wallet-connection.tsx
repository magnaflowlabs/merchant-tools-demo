import { Button } from '@/components/ui/button';
import {
  IconWallet,
  IconCoins,
  IconCurrencyDollar,
  IconCopy,
  IconLogout,
  IconSwitch,
  IconRefresh,
} from '@tabler/icons-react';
import { useState, useEffect, useCallback } from 'react';
import { useWalletModal } from '@tronweb3/tronwallet-adapter-react-ui';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { USDT_CONTRACT_ADDRESSES } from '@/config/constants';
import { truncateFromSun } from '@/lib/utils';
import { useWalletListener } from '@/hooks/use-wallet-listener';

// Custom Wallet Select Button
function CustomWalletSelectButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      size="sm"
      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
    >
      <IconWallet className="h-4 w-4 text-white" />
      Connect Wallet
    </Button>
  );
}

// Wallet Connection Component
export function WalletConnection() {
  const { disconnect, connected, address, connect } = useWallet();
  const [trxBalance, setTrxBalance] = useState('');
  const [usdtBalance, setUsdtBalance] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setVisible } = useWalletModal();

  // Use Wallet Listener Service
  useWalletListener({
    onConnect: (newAddress) => {
      // Can add logic after connection
    },
    onDisconnect: () => {
      setTrxBalance('');
      setUsdtBalance('');
    },
    onAccountsChanged: (newAddress) => {
      // Refresh balance when account is switched
      refreshBalances();
    },
  });

  // Address Truncation Function
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy Address Function
  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // Refresh Balance Function
  const refreshBalances = useCallback(async () => {
    if (!window.tronWeb || !connected || !address) {
      setTrxBalance('');
      setUsdtBalance('');
      return;
    }

    setIsRefreshing(true);
    try {
      const tronWeb = window.tronWeb;
      const userAddress = tronWeb.defaultAddress.base58;

      // Get TRX Balance
      const trx = await tronWeb.trx.getBalance(address);
      setTrxBalance(truncateFromSun(trx, 4));

      // Get USDT Balance
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESSES.nile);
      const usdt = await usdtContract.balanceOf(userAddress).call();
      setUsdtBalance(truncateFromSun(usdt, 4));
    } catch (error) {
      console.error('Refresh balance failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [connected, address]);

  // Automatic Connection Logic
  useEffect(() => {
    // Check if TronLink is connected but the application is not connected
    if (window.tronLink && window.tronLink.ready && !connected) {
      const currentAddress = (window.tronLink as any).selectedAddress;
      if (currentAddress) {
        connect().catch((error) => {
          console.error('Automatic connection failed:', error);
        });
      }
    }
  }, [connected, connect]);

  // Initialize Balance and Listen for Balance Changes
  useEffect(() => {
    refreshBalances();
  }, [connected, address, refreshBalances]);

  // Manual Connect Wallet
  const handleManualConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Manual connection failed:', error);
      // If connection fails, open the wallet selection modal
      setVisible(true);
    }
  };

  return (
    <>
      {connected ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <IconWallet className="h-4 w-4" />
              {truncateAddress(address || '')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* Copy Address */}
            <DropdownMenuItem onClick={copyAddress} className="flex items-center gap-2">
              <IconCopy className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy Address'}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* TRX Balance */}
            <DropdownMenuItem className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCoins className="h-4 w-4" />
                TRX Balance:
              </div>
              <span className="font-semibold text-blue-600">{trxBalance || '0'}</span>
            </DropdownMenuItem>

            {/* USDT Balance */}
            <DropdownMenuItem className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCurrencyDollar className="h-4 w-4" />
                USDT Balance:
              </div>
              <span className="font-semibold text-blue-600">{usdtBalance || '0'}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Refresh Balance */}
            <DropdownMenuItem
              // onClick={refreshBalances}
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

            {/* Switch Wallet */}
            <DropdownMenuItem
              onClick={() => {
                setVisible(true);
              }}
              className="flex items-center gap-2"
            >
              <IconSwitch className="h-4 w-4" />
              Switch Wallet
            </DropdownMenuItem>

            {/* Disconnect */}
            <DropdownMenuItem onClick={disconnect} className="flex items-center gap-2 text-red-600">
              <IconLogout className="h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <CustomWalletSelectButton onClick={handleManualConnect} />
      )}
    </>
  );
}
