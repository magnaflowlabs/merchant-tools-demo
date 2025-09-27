import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import { HDNodeWallet, Wallet } from 'ethers';
import * as ecc from 'tiny-secp256k1';
import { getTronWebInstance } from './tronweb-manager';
import { useWalletStore } from '@/stores/wallet-store';

export const initBip32 = async (): Promise<any> => {
  try {
    const ecc = await import('tiny-secp256k1');
    const bip32Instance = BIP32Factory(ecc);
    return bip32Instance;
  } catch (error) {
    console.error('Failed to initialize BIP32:', error);
    throw new Error('Failed to initialize BIP32');
  }
};

let bip32Instance: any = null;

export const getBip32Instance = async (): Promise<any> => {
  if (!bip32Instance) {
    bip32Instance = await initBip32();
  }
  return bip32Instance;
};

export const bip32 = BIP32Factory(ecc);

export async function getMnemonicFromKeystore(keystore: any, password: any): Promise<string> {
  const wallet = await Wallet.fromEncryptedJson(keystore, password);

  if (!wallet || !(wallet as any).mnemonic?.phrase) {
    throw new Error('❌ This keystore does not have a mnemonic, cannot generate child address');
  }

  const mnemonic = (wallet as any).mnemonic.phrase;
  return mnemonic;
}

/**
 * Generate Tron child address based on mnemonic
 * @param mnemonic
 * @param index
 * @returns Promise<{address: string, privateKey: string, path: string}> return address, privateKey and path
 */
export async function generateTronChildAddress(mnemonic: string, index = 0) {
  // 1. generate seed
  const seed = await bip39.mnemonicToSeed(mnemonic);

  const root = HDNodeWallet.fromSeed(seed);

  // 2. Tron BIP44 path (coin_type=195)
  const path = `m/44'/195'/0'/0/${index}`;
  const child = root.derivePath(path);
  const privateKey = child?.privateKey?.replace(/^0x/i, '');

  const root12 = bip32.fromSeed(seed);
  const child12 = root12.derivePath(path);
  const privateKey12 = Buffer.from(child12?.privateKey || '').toString('hex');

  if (!privateKey) {
    throw new Error('❌ Failed to generate private key');
  }

  // 3. generate Tron address
  const tronWeb = getTronWebInstance('nile');
  const address = tronWeb.address.fromPrivateKey(privateKey) || '';

  return { address, privateKey, path };
}

/**
 * Get Tron child address from keystore based on index
 * @param keystore
 * @param password
 * @param index
 * @returns Promise<{address: string, privateKey: string, path: string}> return address, privateKey and path
 */
export async function getTronChildAddress(keystore: any, password: any, index = 0) {
  const mnemonic = await getMnemonicFromKeystore(keystore, password);
  return await generateTronChildAddress(mnemonic, index);
}

/**
 * Generate Tron child address from stored mnemonic
 * @param index
 * @returns Promise<{address: string, privateKey: string, path: string} | null> return address information or null
 */
export async function generateTronChildAddressFromStorage(index = 0) {
  try {
    // use static import since circular dependency has been resolved
    const { getWalletMnemonic, hasWalletMnemonic } = useWalletStore.getState();

    // check if there is stored mnemonic
    if (!hasWalletMnemonic()) {
      console.warn('No stored mnemonic found, please import wallet first');
      return null;
    }

    // get stored mnemonic
    const mnemonic = getWalletMnemonic();
    if (!mnemonic) {
      console.warn('Failed to get stored mnemonic');
      return null;
    }
    // generate address
    return await generateTronChildAddress(mnemonic, index);
  } catch (error) {
    console.error('address generation failed:', error);
    return null;
  }
}

/**
 * Batch generate multiple Tron child addresses (from stored mnemonic)
 * @param startIndex
 * @param count
 * @returns Promise<Array<{address: string, privateKey: string, path: string}>> return address array
 */
export async function generateMultipleTronAddresses(startIndex = 0, count = 1) {
  try {
    // use static import since circular dependency has been resolved
    const { getWalletMnemonic, hasWalletMnemonic } = useWalletStore.getState();

    // check if there is stored mnemonic
    if (!hasWalletMnemonic()) {
      console.warn('No stored mnemonic found, please import wallet first');
      return [];
    }

    // get stored mnemonic
    const mnemonic = getWalletMnemonic();
    if (!mnemonic) {
      console.warn('Failed to get stored mnemonic');
      return [];
    }
    const seed = await bip39.mnemonicToSeed(mnemonic);

    const root = HDNodeWallet.fromSeed(seed);

    // 3. generate Tron address
    const tronWeb = getTronWebInstance('nile');

    // batch generate addresses
    const addresses = [];
    for (let i = 0; i < count; i++) {
      const index = startIndex + i;
      // 2. Tron BIP44 path (coin_type=195)
      const path = `m/44'/195'/0'/0/${index}`;
      const child = root.derivePath(path);
      const privateKey = child?.privateKey?.replace(/^0x/i, '');

      const root12 = bip32.fromSeed(seed);
      const child12 = root12.derivePath(path);
      const privateKey12 = Buffer.from(child12?.privateKey || '').toString('hex');

      if (!privateKey) {
        throw new Error('❌ Failed to generate private key');
      }

      const address = tronWeb.address.fromPrivateKey(privateKey) || '';
      addresses.push({ address, privateKey, path });
    }
    return addresses;
  } catch (error) {
    console.error('Failed to batch generate addresses:', error);
    return [];
  }
}
