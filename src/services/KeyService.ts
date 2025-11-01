import * as bip39 from 'bip39';

import { TronWeb } from 'tronweb';
import { getTronWebInstance } from '../utils/tronweb-manager';

export interface Key {
  address: string;
  privateKey: string;
  path?: string;
}

export enum CoinType {
  ETH = 'eth',
  TRON = 'tron',
}
export const DERIVATION_PATHS = {
  [CoinType.ETH]: "m/44'/60'/0'/0/",
  [CoinType.TRON]: "m/44'/195'/0'/0/",
} as const;

export class KeyService {
  constructor() {}

  static generateMnemonic(): string {
    const mnemonic = bip39.generateMnemonic(128);
    return mnemonic;
  }
  static ensureTronWeb(network: string = 'nile'): TronWeb {
    return getTronWebInstance(network);
  }

  // validate mnemonic
  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }
  static generateAddress(privateKey: string, network: string): string {
    try {
      const tronWeb = KeyService.ensureTronWeb(network);
      const address = tronWeb.address.fromPrivateKey(privateKey);
      if (!address) {
        throw new Error('Cannot generate address from private key');
      }
      return address;
    } catch (error) {
      console.error('Generate address failed:', error);
      throw new Error(
        `Generate address failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const keyService = new KeyService();
