/**
 * Web Worker for generating Tron addresses in background thread
 * This prevents UI blocking during intensive cryptographic operations
 */

import * as bip39 from 'bip39';
import { HDNodeWallet } from 'ethers';
import { TronWeb } from 'tronweb';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally in Web Worker
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

// Message types for worker communication
export interface GenerateAddressesMessage {
  type: 'GENERATE_ADDRESSES';
  payload: {
    mnemonic: string;
    startIndex: number;
    count: number;
    chunkSize?: number;
    fullHost?: string;
    headers?: Record<string, string>;
  };
}

export interface ProgressMessage {
  type: 'PROGRESS';
  payload: {
    current: number;
    total: number;
  };
}

export interface SuccessMessage {
  type: 'SUCCESS';
  payload: {
    addresses: Array<{
      address: string;
      privateKey: string;
      path: string;
    }>;
  };
}

export interface ErrorMessage {
  type: 'ERROR';
  payload: {
    error: string;
  };
}

export type WorkerMessage = GenerateAddressesMessage;
export type WorkerResponse = ProgressMessage | SuccessMessage | ErrorMessage;

// Create TronWeb instance for address generation
function createTronWebInstance(fullHost: string, headers?: Record<string, string>): TronWeb {
  return new TronWeb({
    fullHost,
    headers,
  });
}

async function generateAddresses(
  mnemonic: string,
  startIndex: number,
  count: number,
  chunkSize = 50,
  fullHost: string,
  headers?: Record<string, string>
): Promise<Array<{ address: string; privateKey: string; path: string }>> {
  // Generate seed and root once - expensive operations
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = HDNodeWallet.fromSeed(seed);

  // Create TronWeb instance once with provided config or fallback to default
  const tronWeb = createTronWebInstance(fullHost, headers);

  const addresses = [];

  for (let chunkStart = 0; chunkStart < count; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, count);

    // Process chunk
    for (let i = chunkStart; i < chunkEnd; i++) {
      const index = startIndex + i;
      const path = `m/44'/195'/0'/0/${index}`;

      const child = root.derivePath(path);
      const privateKey = child?.privateKey?.replace(/^0x/i, '');

      if (!privateKey) {
        throw new Error('Failed to generate private key');
      }

      // Use real TronWeb for address generation
      const address = tronWeb.address.fromPrivateKey(privateKey) || '';
      addresses.push({ address, privateKey, path });
    }

    // Report progress
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        current: chunkEnd,
        total: count,
      },
    } as ProgressMessage);

    // Yield control between chunks
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return addresses;
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'GENERATE_ADDRESSES': {
        const { mnemonic, startIndex, count, chunkSize, fullHost, headers } = payload;

        const addresses = await generateAddresses(
          mnemonic,
          startIndex,
          count,
          chunkSize,
          fullHost || '',
          headers
        );

        self.postMessage({
          type: 'SUCCESS',
          payload: { addresses },
        } as SuccessMessage);
        break;
      }
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    } as ErrorMessage);
  }
};
