import { useState, useEffect, useCallback } from 'react';
import { privateKeyManager } from '@/services/PrivateKeyManager';
import { useTronWeb } from '@/hooks/use-tronweb';
import { truncateFromSun } from '@/lib/utils';
import { useUsdtContract } from '@/hooks/use-token-contract';

export function usePrivateKeyConnection() {
  const [privateKeyConnected, setPrivateKeyConnected] = useState(false);
  const [privateKeyAddress, setPrivateKeyAddress] = useState('');

  useEffect(() => {
    const connectionInfo = privateKeyManager.getConnectionInfo();
    if (connectionInfo.isConnected && connectionInfo.address) {
      setPrivateKeyAddress(connectionInfo.address);
      setPrivateKeyConnected(true);
    }

    const handleConnected = (data: { address: string; timestamp: number } | null) => {
      if (data?.address) {
        setPrivateKeyAddress(data.address);
        setPrivateKeyConnected(true);
      }
    };

    const handleDisconnected = () => {
      setPrivateKeyAddress('');
      setPrivateKeyConnected(false);
    };

    privateKeyManager.addEventListener('connected', handleConnected);
    privateKeyManager.addEventListener('disconnected', handleDisconnected);

    return () => {
      privateKeyManager.removeEventListener('connected', handleConnected);
      privateKeyManager.removeEventListener('disconnected', handleDisconnected);
    };
  }, []);

  return {
    privateKeyConnected,
    privateKeyAddress,
    setPrivateKeyAddress,
    setPrivateKeyConnected,
  };
}

export function useWalletBalance(privateKeyConnected: boolean, privateKeyAddress: string) {
  const [trxBalance, setTrxBalance] = useState('');
  const [usdtBalance, setUsdtBalance] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const getUsdtContractAddress = useUsdtContract();
  const tronWeb = useTronWeb();

  const refreshBalances = useCallback(async () => {
    if (!window.tronWeb || !privateKeyConnected) {
      setTrxBalance('');
      setUsdtBalance('');
      return;
    }

    setIsRefreshing(true);
    try {
      const targetAddress = privateKeyConnected ? privateKeyAddress : '';

      if (!targetAddress) {
        setTrxBalance('');
        setUsdtBalance('');
        return;
      }

      tronWeb.setAddress(targetAddress);

      const trx = await tronWeb.trx.getBalance(targetAddress);
      setTrxBalance(truncateFromSun(trx, 4));

      if (getUsdtContractAddress) {
        const usdtContract = await tronWeb.contract().at(getUsdtContractAddress);
        const usdt = await usdtContract.balanceOf(targetAddress).call();
        setUsdtBalance(truncateFromSun(usdt, 4));
      }
    } catch (error) {
      console.error('Failed to refresh balances:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [privateKeyConnected, privateKeyAddress, getUsdtContractAddress, tronWeb]);

  useEffect(() => {
    refreshBalances();
  }, [privateKeyConnected, privateKeyAddress, refreshBalances]);

  return {
    trxBalance,
    usdtBalance,
    isRefreshing,
    refreshBalances,
    setTrxBalance,
    setUsdtBalance,
  };
}

export function useCopyAddress() {
  const [copied, setCopied] = useState(false);

  const copyAddress = async (address: string) => {
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

  return {
    copied,
    copyAddress,
  };
}
