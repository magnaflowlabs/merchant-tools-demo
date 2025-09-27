import { ethers } from 'ethers';

export interface ImportKeystoreResult {
  success: boolean;
  walletName?: string;
  address?: string;
  errorMessage?: string;
}

export async function importKeystore(
  keystoreJsonContent: string,
  password: string
): Promise<ImportKeystoreResult> {
  try {
    const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJsonContent, password);

    // get wallet address
    const address = wallet.address;

    // try to get wallet name from keystore JSON
    let walletName = 'Imported Wallet';
    try {
      const keystoreData = JSON.parse(keystoreJsonContent);
      if (keystoreData.name) {
        walletName = keystoreData.name;
      } else if (keystoreData.walletName) {
        walletName = keystoreData.walletName;
      } else if (keystoreData.label) {
        walletName = keystoreData.label;
      } else if (keystoreData.description) {
        walletName = keystoreData.description;
      }
    } catch {
      // if parsing fails, use default name
    }

    return {
      success: true,
      walletName,
      address,
    };
  } catch (err) {
    let errorMessage = 'Password error or Keystore file invalid';

    if (err instanceof Error) {
      if (err.message.includes('wrong passphrase')) {
        errorMessage = 'Password error, please check and try again';
      } else if (err.message.includes('invalid json')) {
        errorMessage = 'Keystore file format invalid';
      } else if (err.message.includes('invalid keystore')) {
        errorMessage = 'Keystore file corrupted or format incorrect';
      }
    }

    return {
      success: false,
      errorMessage,
    };
  }
}
