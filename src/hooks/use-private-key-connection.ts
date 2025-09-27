import { useState, useEffect } from 'react';
import { privateKeyManager } from '@/services/PrivateKeyManager';

export function usePrivateKeyConnection() {
  const [connectionInfo, setConnectionInfo] = useState(() => privateKeyManager.getConnectionInfo());

  useEffect(() => {
    const updateConnectionInfo = () => {
      const newConnectionInfo = privateKeyManager.getConnectionInfo();
      setConnectionInfo(newConnectionInfo);
    };

    updateConnectionInfo();

    const handleConnected = () => {
      updateConnectionInfo();
    };

    const handleDisconnected = () => {
      updateConnectionInfo();
    };

    // register event listener
    privateKeyManager.addEventListener('connected', handleConnected);
    privateKeyManager.addEventListener('disconnected', handleDisconnected);

    // clean up event listener
    return () => {
      privateKeyManager.removeEventListener('connected', handleConnected);
      privateKeyManager.removeEventListener('disconnected', handleDisconnected);
    };
  }, []);

  return {
    connectionInfo,
    isConnected: connectionInfo.isConnected,
    address: connectionInfo.address,
    timestamp: connectionInfo.timestamp,
    // provide convenient method
    getPrivateKey: () => privateKeyManager.getPrivateKey(),
    clearPrivateKey: () => privateKeyManager.clearPrivateKey(),
  };
}
