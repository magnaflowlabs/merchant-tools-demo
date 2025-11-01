/**
 * Secure private key data structure
 * Uses Uint8Array for memory-safe storage
 */
interface PrivateKeyData {
  // Store private key as bytes for secure memory management
  privateKeyBytes: Uint8Array;
  address: string;
  timestamp: number;
}

/**
 * Public interface (without sensitive data)
 */
interface PublicPrivateKeyData {
  address: string;
  timestamp: number;
}

type PrivateKeyEventType = 'connected' | 'disconnected' | 'updated';

type EventListener = (data: PublicPrivateKeyData | null) => void;

/**
 * Secure utility to zero out memory
 */
function secureZeroBuffer(buffer: Uint8Array): void {
  // Fill with random data multiple times to prevent memory recovery
  const random = new Uint8Array(buffer.length);
  for (let i = 0; i < 3; i++) {
    crypto.getRandomValues(random);
    buffer.set(random);
  }
  buffer.fill(0);
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/^0x/i, '').replace(/\s/g, '');
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    throw new Error('Invalid private key format');
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 * Note: This creates a temporary string in memory - use with caution
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Secure Private Key Manager
 * Uses memory-safe storage with automatic cleanup
 */
class PrivateKeyManager {
  private static instance: PrivateKeyManager;
  private privateKeyData: PrivateKeyData | null = null;
  private eventListeners: Map<PrivateKeyEventType, Set<EventListener>> = new Map();
  private cleanupRegistered = false;

  private constructor() {
    this.registerPageUnloadCleanup();
  }

  public static getInstance(): PrivateKeyManager {
    if (!PrivateKeyManager.instance) {
      PrivateKeyManager.instance = new PrivateKeyManager();
    }
    return PrivateKeyManager.instance;
  }

  /**
   * Register cleanup on page unload for security
   */
  private registerPageUnloadCleanup(): void {
    if (this.cleanupRegistered || typeof window === 'undefined') return;
    this.cleanupRegistered = true;

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.clearPrivateKey();
    });

    // Clean up on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Optionally clear on tab switch for extra security
        // Commented out as it may be too aggressive
        // this.clearPrivateKey();
      }
    });
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
      // Only expose non-sensitive data to event listeners
      const publicData: PublicPrivateKeyData | null = this.privateKeyData
        ? {
            address: this.privateKeyData.address,
            timestamp: this.privateKeyData.timestamp,
          }
        : null;

      listeners.forEach((listener) => {
        try {
          listener(publicData);
        } catch (error) {
          // Use logger instead of console.error to avoid leaking errors
          if (import.meta.env.DEV) {
            console.error('failed to trigger event', error);
          }
        }
      });
    }
  }

  /**
   * Store private key securely
   * @param privateKey - Hex string private key (64 chars)
   * @param address - Wallet address
   */
  public storePrivateKey(privateKey: string, address: string): void {
    // Clear existing key first
    this.clearPrivateKey();

    try {
      const privateKeyBytes = hexToBytes(privateKey);
      this.privateKeyData = {
        privateKeyBytes,
        address,
        timestamp: Date.now(),
      };
      this.triggerEvent('connected');
    } catch (error) {
      // Clear on error
      this.privateKeyData = null;
      throw new Error('Invalid private key format');
    }
  }

  /**
   * Get public connection data (without sensitive private key)
   */
  public getPrivateKeyData(): PublicPrivateKeyData | null {
    if (!this.privateKeyData) return null;
    return {
      address: this.privateKeyData.address,
      timestamp: this.privateKeyData.timestamp,
    };
  }

  /**
   * Get private key as string
   * WARNING: This creates a temporary string in memory. Use only when necessary.
   * The string may remain in memory until garbage collected.
   */
  public getPrivateKey(): string | null {
    if (!this.privateKeyData) return null;

    // Create temporary string - unavoidable for compatibility with TronWeb
    const hexString = bytesToHex(this.privateKeyData.privateKeyBytes);

    // Note: We cannot securely clear the string after return
    // JavaScript strings are immutable and GC handles cleanup
    // This is a limitation of the current approach
    return hexString;
  }

  /**
   * Execute a callback with the private key, then clear temporary string
   * More secure way to use private key
   * Note: JavaScript strings are immutable, so we can only clear the reference.
   * The actual string may remain in memory until garbage collected.
   */
  public withPrivateKey<T>(callback: (privateKey: string) => T): T | null {
    if (!this.privateKeyData) return null;

    // Get private key as hex string for callback
    const hexString = bytesToHex(this.privateKeyData.privateKeyBytes);
    try {
      return callback(hexString);
    } finally {
      // Note: JavaScript strings are immutable and cannot be cleared from memory.
      // The memory will be reclaimed by the garbage collector when appropriate.
    }
  }

  public getAddress(): string | null {
    return this.privateKeyData?.address || null;
  }

  public isConnected(): boolean {
    return this.privateKeyData !== null;
  }

  /**
   * Securely clear private key from memory
   */
  public clearPrivateKey(): void {
    if (this.privateKeyData?.privateKeyBytes) {
      // Securely zero out the private key bytes
      secureZeroBuffer(this.privateKeyData.privateKeyBytes);
    }

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

export type { PrivateKeyData, PublicPrivateKeyData };
