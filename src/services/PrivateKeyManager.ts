interface PrivateKeyData {
  privateKey: string;
  address: string;
  timestamp: number;
}

type PrivateKeyEventType = 'connected' | 'disconnected' | 'updated';

type EventListener = (data: PrivateKeyData | null) => void;

class PrivateKeyManager {
  private static instance: PrivateKeyManager;
  private privateKeyData: PrivateKeyData | null = null;
  private eventListeners: Map<PrivateKeyEventType, Set<EventListener>> = new Map();

  private constructor() {}

  public static getInstance(): PrivateKeyManager {
    if (!PrivateKeyManager.instance) {
      PrivateKeyManager.instance = new PrivateKeyManager();
    }
    return PrivateKeyManager.instance;
  }

  public addEventListener(eventType: PrivateKeyEventType, listener: EventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  public removeEventListener(eventType: PrivateKeyEventType, listener: EventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private triggerEvent(eventType: PrivateKeyEventType): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(this.privateKeyData);
        } catch (error) {
          console.error('failed to trigger event', error);
        }
      });
    }
  }

  public storePrivateKey(privateKey: string, address: string): void {
    this.privateKeyData = {
      privateKey,
      address,
      timestamp: Date.now(),
    };
    this.triggerEvent('connected');
  }

  public getPrivateKeyData(): PrivateKeyData | null {
    return this.privateKeyData;
  }

  public getPrivateKey(): string | null {
    return this.privateKeyData?.privateKey || null;
  }

  public getAddress(): string | null {
    return this.privateKeyData?.address || null;
  }

  public isConnected(): boolean {
    return this.privateKeyData !== null;
  }

  public clearPrivateKey(): void {
    this.privateKeyData = null;
    this.triggerEvent('disconnected');
  }

  public getConnectionInfo(): {
    isConnected: boolean;
    address: string | null;
    timestamp: number | null;
  } {
    return {
      isConnected: this.isConnected(),
      address: this.getAddress(),
      timestamp: this.privateKeyData?.timestamp || null,
    };
  }
}

export const privateKeyManager = PrivateKeyManager.getInstance();

export type { PrivateKeyData };
