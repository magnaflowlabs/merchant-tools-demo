/**
 * mnemonic management tool
 * provide safe mnemonic storage and retrieval functionality
 */

// simple encryption key (in actual projects, should use a more secure way)
const ENCRYPTION_KEY = 'magnaflow_mnemonic_key_2024';

/**
 * simple string encryption function
 * @param text
 * @param key
 * @returns
 */
function encryptText(text: string, key: string): string {
  try {
    // use simple XOR encryption (in actual projects, should use a stronger encryption algorithm)
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    return btoa(encrypted); // Base64 encoding
  } catch (error) {
    console.error('encryption failed:', error);
    throw new Error('encryption failed');
  }
}

/**
 * simple string decryption function
 * @param encryptedText
 * @param key
 * @returns
 */
function decryptText(encryptedText: string, key: string): string {
  try {
    const decoded = atob(encryptedText); // Base64 decoding
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }
    return decrypted;
  } catch (error) {
    console.error('decryption failed:', error);
    throw new Error('decryption failed');
  }
}

/**
 * store mnemonic to localStorage
 * @param mnemonic
 * @param walletId wallet ID (for different wallets)
 */
export function storeMnemonic(mnemonic: string, walletId: string): void {
  try {
    const encryptedMnemonic = encryptText(mnemonic, ENCRYPTION_KEY);
    const storageKey = `mnemonic_${walletId}`;
    localStorage.setItem(storageKey, encryptedMnemonic);
  } catch (error) {
    console.error('store mnemonic failed:', error);
    throw new Error('store mnemonic failed');
  }
}

/**
 * get mnemonic from localStorage
 * @param walletId wallet ID
 * @returns mnemonic string
 */
export function getMnemonic(walletId: string): string | null {
  try {
    const storageKey = `mnemonic_${walletId}`;
    const encryptedMnemonic = localStorage.getItem(storageKey);

    if (!encryptedMnemonic) {
      return null;
    }

    const mnemonic = decryptText(encryptedMnemonic, ENCRYPTION_KEY);
    return mnemonic;
  } catch (error) {
    console.error('get mnemonic failed:', error);
    return null;
  }
}

/**
 * check if mnemonic is stored
 * @param walletId
 * @returns if mnemonic is stored
 */
export function hasStoredMnemonic(walletId: string): boolean {
  const storageKey = `mnemonic_${walletId}`;
  return localStorage.getItem(storageKey) !== null;
}

/**
 * remove stored mnemonic
 * @param walletId
 */
export function removeMnemonic(walletId: string): void {
  try {
    const storageKey = `mnemonic_${walletId}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('remove mnemonic failed:', error);
  }
}

/**
 * clear all stored mnemonics
 */
export function clearAllMnemonics(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('mnemonic_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('clear all mnemonics failed:', error);
  }
}
