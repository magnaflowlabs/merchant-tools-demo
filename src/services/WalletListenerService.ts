import { getTronWebInstance } from '../utils/tronweb-manager';
import { logger } from '../utils/logger';
import { useChainConfigStore } from '@/stores/chain-config-store';
export interface WalletStateChangeEvent {
  type: 'connect' | 'disconnect' | 'accountsChanged';
  address?: string;
  timestamp: number;
}

export type WalletStateChangeCallback = (event: WalletStateChangeEvent) => void;

export class WalletListenerService {
  private listeners: Set<WalletStateChangeCallback> = new Set();
  private isListening = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastKnownAddress: string | null = null;

  constructor() {
    this.setupGlobalListeners();
  }

  addListener(callback: WalletStateChangeCallback): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  removeListener(callback: WalletStateChangeCallback): void {
    this.listeners.delete(callback);
  }

  private emitEvent(event: WalletStateChangeEvent): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        logger.error('failed to emit event', error);
      }
    });
  }

  private setupGlobalListeners(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    window.addEventListener('focus', this.handleWindowFocus.bind(this));

    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  startListening(): void {
    if (this.isListening) return;

    this.isListening = true;

    this.checkWalletState();

    this.checkInterval = setInterval(() => {
      this.checkWalletState();
    }, 30000);

    this.setupTronLinkListeners();
  }

  stopListening(): void {
    if (!this.isListening) return;

    this.isListening = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.removeTronLinkListeners();
  }

  private checkWalletState(): void {
    if (!this.isListening) return;

    const tronLink = (window as any).tronLink;

    let tronWeb: any = null;
    try {
      const curChainConfig = useChainConfigStore.getState().curChainConfig;
      tronWeb = curChainConfig?.chain
        ? getTronWebInstance(curChainConfig)
        : getTronWebInstance('nile');
    } catch (error) {
      tronWeb = (window as any).tronWeb;
    }

    if (!tronLink) {
      if (this.lastKnownAddress) {
        this.emitEvent({
          type: 'disconnect',
          timestamp: Date.now(),
        });
        this.lastKnownAddress = null;
      }
      return;
    }

    if (!tronLink.ready) {
      if (this.lastKnownAddress) {
        this.emitEvent({
          type: 'disconnect',
          timestamp: Date.now(),
        });
        this.lastKnownAddress = null;
      }
      return;
    }

    const currentAddress = tronLink.selectedAddress || tronWeb?.defaultAddress?.base58 || null;

    if (currentAddress !== this.lastKnownAddress) {
      if (this.lastKnownAddress && currentAddress) {
        this.emitEvent({
          type: 'accountsChanged',
          address: currentAddress,
          timestamp: Date.now(),
        });
      } else if (currentAddress && !this.lastKnownAddress) {
        this.emitEvent({
          type: 'connect',
          address: currentAddress,
          timestamp: Date.now(),
        });
      } else if (!currentAddress && this.lastKnownAddress) {
        this.emitEvent({
          type: 'disconnect',
          timestamp: Date.now(),
        });
      }

      this.lastKnownAddress = currentAddress;
    }
  }

  private setupTronLinkListeners(): void {
    const tronLink = (window as any).tronLink;
    if (!tronLink) return;

    const handleTronLinkEvent = (eventType: string) => {
      this.checkWalletState();
    };

    if (tronLink.addEventListener) {
      tronLink.addEventListener('accountsChanged', () => handleTronLinkEvent('accountsChanged'));
      tronLink.addEventListener('connect', () => handleTronLinkEvent('connect'));
      tronLink.addEventListener('disconnect', () => handleTronLinkEvent('disconnect'));
    }

    if (tronLink.on) {
      tronLink.on('accountsChanged', () => handleTronLinkEvent('accountsChanged'));
      tronLink.on('connect', () => handleTronLinkEvent('connect'));
      tronLink.on('disconnect', () => handleTronLinkEvent('disconnect'));
    }
  }

  private removeTronLinkListeners(): void {
    const tronLink = (window as any).tronLink;
    if (!tronLink) return;

    const handleTronLinkEvent = (eventType: string) => {
      this.checkWalletState();
    };

    if (tronLink.removeEventListener) {
      tronLink.removeEventListener('accountsChanged', () => handleTronLinkEvent('accountsChanged'));
      tronLink.removeEventListener('connect', () => handleTronLinkEvent('connect'));
      tronLink.removeEventListener('disconnect', () => handleTronLinkEvent('disconnect'));
    }

    if (tronLink.off) {
      tronLink.off('accountsChanged', () => handleTronLinkEvent('accountsChanged'));
      tronLink.off('connect', () => handleTronLinkEvent('connect'));
      tronLink.off('disconnect', () => handleTronLinkEvent('disconnect'));
    }
  }

  private handleVisibilityChange(): void {
    if (!document.hidden) {
      setTimeout(() => {
        this.checkWalletState();
      }, 1000);
    }
  }

  private handleWindowFocus(): void {
    setTimeout(() => {
      this.checkWalletState();
    }, 500);
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'wallet-state') {
      try {
        const walletState = JSON.parse(event.newValue || '{}');
        this.checkWalletState();
      } catch (error) {
        logger.error('failed to parse wallet state', error);
      }
    }
  }

  getCurrentState(): { connected: boolean; address: string | null } {
    const tronLink = (window as any).tronLink;

    let tronWeb: any = null;
    try {
      const curChainConfig = useChainConfigStore.getState().curChainConfig;
      tronWeb = curChainConfig?.chain
        ? getTronWebInstance(curChainConfig)
        : getTronWebInstance('nile');
    } catch (error) {
      tronWeb = (window as any).tronWeb;
    }

    if (!tronLink || !tronLink.ready) {
      return { connected: false, address: null };
    }

    const address = tronLink.selectedAddress || tronWeb?.defaultAddress?.base58 || null;

    return {
      connected: !!address,
      address,
    };
  }

  destroy(): void {
    this.stopListening();
    this.listeners.clear();
    this.lastKnownAddress = null;
  }
}

export const walletListenerService = new WalletListenerService();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    walletListenerService.destroy();
  });
}
