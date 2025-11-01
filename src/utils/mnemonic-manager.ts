/**
 * Secure mnemonic management tool
 * Uses Web Crypto API with AES-GCM encryption
 */

/**
 * Encryption format version
 */
const ENCRYPTION_VERSION = {
  LEGACY_XOR: '1', // Old XOR encryption (deprecated)
  AES_GCM: '2', // New AES-GCM encryption
};

/**
 * PBKDF2 parameters for key derivation
 */
const PBKDF2_PARAMS: Pbkdf2Params = {
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 100000, // OWASP recommended minimum
  salt: new Uint8Array([
    // Fixed salt based on application context (not user-specific)
    // In production, consider making this configurable per deployment
    0x6d, 0x61, 0x67, 0x6e, 0x61, 0x66, 0x6c, 0x6f, 0x77, 0x5f, 0x6d, 0x6e, 0x65, 0x6d, 0x6f, 0x6e,
    0x69, 0x63, 0x5f, 0x73, 0x61, 0x6c, 0x74, 0x5f, 0x32, 0x30, 0x32, 0x34, 0x5f, 0x73, 0x65, 0x63,
  ]),
};

/**
 * AES-GCM encryption parameters
 */
const AES_GCM_PARAMS: AesGcmParams = {
  name: 'AES-GCM',
  iv: new Uint8Array(12), // Will be generated for each encryption
  tagLength: 128,
};

/**
 * Derive encryption key from wallet ID
 * Uses PBKDF2 to create a unique key per wallet
 */
async function deriveKey(walletId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const walletIdBytes = encoder.encode(walletId);

  // Import wallet ID as key material
  const keyMaterial = await crypto.subtle.importKey('raw', walletIdBytes, 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);

  // Derive AES key
  const key = await crypto.subtle.deriveKey(
    PBKDF2_PARAMS,
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Generate random IV for encryption
 */
function generateIV(): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

/**
 * Encrypt text using AES-GCM
 */
async function encryptTextSecure(text: string, walletId: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Derive key from wallet ID
    const key = await deriveKey(walletId);

    // Generate random IV
    const iv = generateIV();

    // Encrypt
    const encryptionParams: AesGcmParams = {
      ...AES_GCM_PARAMS,
      iv: iv.buffer as ArrayBuffer,
    };
    const encryptedData = await crypto.subtle.encrypt(encryptionParams, key, data);

    // Combine version, IV, and encrypted data
    const versionByte = new Uint8Array([parseInt(ENCRYPTION_VERSION.AES_GCM)]);
    const combined = new Uint8Array(versionByte.length + iv.length + encryptedData.byteLength);
    combined.set(versionByte, 0);
    combined.set(iv, versionByte.length);
    combined.set(new Uint8Array(encryptedData), versionByte.length + iv.length);

    // Convert to base64 (handle large arrays)
    const chars: string[] = [];
    for (let i = 0; i < combined.length; i++) {
      chars.push(String.fromCharCode(combined[i]));
    }
    return btoa(chars.join(''));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Secure encryption failed:', error);
    }
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt text using AES-GCM
 */
async function decryptTextSecure(encryptedText: string, walletId: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedText), (c) => c.charCodeAt(0));

    if (combined.length < 1) {
      throw new Error('Invalid encrypted data format');
    }

    // Check version
    const version = combined[0].toString();

    if (version === ENCRYPTION_VERSION.AES_GCM) {
      // New AES-GCM format
      if (combined.length < 13) {
        throw new Error('Invalid encrypted data length');
      }

      const iv = combined.slice(1, 13);
      const encryptedData = combined.slice(13);

      // Derive key from wallet ID
      const key = await deriveKey(walletId);

      // Decrypt
      const decryptionParams: AesGcmParams = {
        ...AES_GCM_PARAMS,
        iv: iv.buffer as ArrayBuffer,
      };
      const decryptedData = await crypto.subtle.decrypt(decryptionParams, key, encryptedData);

      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } else if (version === ENCRYPTION_VERSION.LEGACY_XOR) {
      // Legacy XOR format - for backward compatibility
      return decryptTextLegacy(encryptedText.substring(1)); // Remove version byte
    } else {
      throw new Error(`Unsupported encryption version: ${version}`);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Secure decryption failed:', error);
    }
    throw new Error('Decryption failed');
  }
}

/**
 * Legacy XOR encryption (deprecated, for backward compatibility only)
 * @deprecated Use encryptTextSecure instead
 */
function encryptTextLegacy(text: string, key: string): string {
  try {
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    return btoa(encrypted);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Legacy encryption failed:', error);
    }
    throw new Error('Legacy encryption failed');
  }
}

/**
 * Legacy XOR decryption (deprecated, for backward compatibility only)
 * @deprecated Use decryptTextSecure instead
 */
function decryptTextLegacy(encryptedText: string): string {
  try {
    // Try with legacy key
    const LEGACY_KEY = 'magnaflow_mnemonic_key_2024';
    const decoded = atob(encryptedText);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ LEGACY_KEY.charCodeAt(i % LEGACY_KEY.length);
      decrypted += String.fromCharCode(charCode);
    }
    return decrypted;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Legacy decryption failed:', error);
    }
    throw new Error('Legacy decryption failed');
  }
}

/**
 * Store mnemonic to localStorage with secure encryption
 * @param mnemonic - Mnemonic phrase
 * @param walletId - Wallet ID (for different wallets)
 */
export async function storeMnemonic(mnemonic: string, walletId: string): Promise<void> {
  try {
    // Validate inputs
    if (!mnemonic || !walletId) {
      throw new Error('Mnemonic and wallet ID are required');
    }

    // Use secure AES-GCM encryption
    const encryptedMnemonic = await encryptTextSecure(mnemonic, walletId);
    const storageKey = `mnemonic_${walletId}`;
    localStorage.setItem(storageKey, encryptedMnemonic);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Store mnemonic failed:', error);
    }
    throw new Error('Failed to store mnemonic');
  }
}

/**
 * Get mnemonic from localStorage
 * Supports both new AES-GCM and legacy XOR encryption formats
 * @param walletId - Wallet ID
 * @returns Mnemonic string or null
 */
export async function getMnemonic(walletId: string): Promise<string | null> {
  try {
    const storageKey = `mnemonic_${walletId}`;
    const encryptedMnemonic = localStorage.getItem(storageKey);

    if (!encryptedMnemonic) {
      return null;
    }

    // Try to decrypt (handles both new and legacy formats)
    const mnemonic = await decryptTextSecure(encryptedMnemonic, walletId);

    // If successful and it was legacy format, re-encrypt with new format for migration
    if (encryptedMnemonic && encryptedMnemonic.length > 0) {
      const firstByte = atob(encryptedMnemonic).charCodeAt(0);
      if (
        firstByte.toString() === ENCRYPTION_VERSION.LEGACY_XOR ||
        (firstByte >= 1 && firstByte < 10 && firstByte.toString() !== ENCRYPTION_VERSION.AES_GCM)
      ) {
        // Migrate to new format silently
        try {
          await storeMnemonic(mnemonic, walletId);
        } catch {
          // Ignore migration errors, original decryption succeeded
        }
      }
    }

    return mnemonic;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Get mnemonic failed:', error);
    }
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
