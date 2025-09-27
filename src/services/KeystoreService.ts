import { ethers } from 'ethers';
import { validateKeystoreForm, type KeystoreFormData } from '@/utils/validators';
import * as bip39 from 'bip39';

// add type declaration for showSaveFilePicker API
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }

  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    close(): Promise<void>;
  }
}
interface KeystoreState {
  currentMnemonic: string | null;
}

/**
 * download object as JSON file
 */
async function downloadObjectAsJson(obj: Record<string, unknown>, filename: string) {
  const dataStr = JSON.stringify(obj, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  try {
    // use showSaveFilePicker API to let user choose save location
    if (!window.showSaveFilePicker) {
      throw new Error('showSaveFilePicker not supported');
    }

    const handle = await window.showSaveFilePicker({
      suggestedName: `${filename}.json`,
      types: [
        {
          description: 'JSON file',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(dataStr);
    await writable.close();
  } catch (error) {
    console.warn('showSaveFilePicker not supported, falling back to default download:', error);
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * create encrypted keystore JSON file
 * @param mnemonic
 * @param formData
 * @returns Promise<boolean> whether successfully created
 */
export async function createKeystore(
  mnemonic: string,
  formData: KeystoreFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    // validate input - use unified validation function
    const validationErrors = validateKeystoreForm(formData);
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors[0].message };
    }

    if (!mnemonic) {
      return { success: false, error: 'Mnemonic not found, please return and regenerate' };
    }

    const isValidateMnemonic = bip39.validateMnemonic(mnemonic);

    const wallet = isValidateMnemonic
      ? ethers.Wallet.fromPhrase(mnemonic)
      : new ethers.Wallet(mnemonic);

    const keystoreJson = await wallet.encrypt(formData.password);
    const keystoreObject = JSON.parse(keystoreJson);

    keystoreObject.walletName = formData.walletName;
    keystoreObject.description = formData.description;

    await downloadObjectAsJson(keystoreObject, `${formData.walletName}-keystore`);

    return { success: true };
  } catch (error) {
    console.error('Keystore creation failed:', error);
    return { success: false, error: 'Create keystore failed, please try again' };
  }
}

/**
 * KeystoreService
 */
export class KeystoreService {
  private state: KeystoreState = {
    currentMnemonic: null,
  };

  setCurrentMnemonic(mnemonic: string) {
    this.state.currentMnemonic = mnemonic;
  }

  getCurrentMnemonic(): string | null {
    return this.state.currentMnemonic;
  }

  clearCurrentMnemonic() {
    this.state.currentMnemonic = null;
  }

  async createKeystoreWithState(
    formData: KeystoreFormData
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.state.currentMnemonic) {
      return { success: false, error: 'Mnemonic phrase not found, please return and regenerate' };
    }

    const result = await createKeystore(this.state.currentMnemonic, formData);

    if (result.success) {
      this.clearCurrentMnemonic();
    }

    return result;
  }
}
