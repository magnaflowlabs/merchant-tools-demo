import { useEffect, useRef, useCallback, useState } from 'react';
import { walletListenerService } from '../services/WalletListenerService';
import type { WalletStateChangeEvent } from '../services/WalletListenerService';
import { logger } from '../utils/logger';

export interface UseWalletListenerOptions {
  autoStart?: boolean;
  autoStop?: boolean;
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  onAccountsChanged?: (address: string) => void;
  onStateChange?: (event: WalletStateChangeEvent) => void;
}

export interface UseWalletListenerReturn {
  startListening: () => void;
  stopListening: () => void;
  getCurrentState: () => { connected: boolean; address: string | null };
  isListening: boolean;
}

export function useWalletListener(options: UseWalletListenerOptions = {}): UseWalletListenerReturn {
  const {
    autoStart = true,
    autoStop = true,
    onConnect,
    onDisconnect,
    onAccountsChanged,
    onStateChange,
  } = options;

  const isListeningRef = useRef(false);
  const removeListenerRef = useRef<(() => void) | null>(null);

  const handleWalletStateChange = useCallback(
    (event: WalletStateChangeEvent) => {
      if (onStateChange) {
        try {
          onStateChange(event);
        } catch (error) {
          logger.error(error as string);
        }
      }

      switch (event.type) {
        case 'connect':
          if (onConnect && event.address) {
            try {
              onConnect(event.address);
            } catch (error) {
              logger.error('failed to connect', error);
            }
          }
          break;

        case 'disconnect':
          if (onDisconnect) {
            try {
              onDisconnect();
            } catch (error) {
              logger.error('failed to disconnect', error);
            }
          }
          break;

        case 'accountsChanged':
          if (onAccountsChanged && event.address) {
            try {
              onAccountsChanged(event.address);
            } catch (error) {
              logger.error('failed to accountsChanged', error);
            }
          }
          break;
      }
    },
    [onConnect, onDisconnect, onAccountsChanged, onStateChange]
  );

  const startListening = useCallback(() => {
    if (isListeningRef.current) {
      return;
    }

    isListeningRef.current = true;

    removeListenerRef.current = walletListenerService.addListener(handleWalletStateChange);

    walletListenerService.startListening();
  }, [handleWalletStateChange]);

  const stopListening = useCallback(() => {
    if (!isListeningRef.current) {
      return;
    }

    isListeningRef.current = false;

    if (removeListenerRef.current) {
      removeListenerRef.current();
      removeListenerRef.current = null;
    }

    walletListenerService.stopListening();
  }, []);

  const getCurrentState = useCallback(() => {
    return walletListenerService.getCurrentState();
  }, []);

  useEffect(() => {
    if (autoStart) {
      startListening();
    }

    if (autoStop) {
      return () => {
        stopListening();
      };
    }
  }, [autoStart, autoStop, startListening, stopListening]);

  return {
    startListening,
    stopListening,
    getCurrentState,
    isListening: isListeningRef.current,
  };
}
