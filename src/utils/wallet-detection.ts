/**
 * Wallet detection utility functions
 * Detect available wallet adapters based on window object
 */

// Wallet type definitions
export interface WalletInfo {
  name: string;
  isInstalled: boolean;
  windowProperty?: string;
}

// Detect TronLink wallet
export function detectTronLink(): WalletInfo {
  const isInstalled = !!(window as any).tronLink;
  return {
    name: 'TronLink',
    isInstalled,
    windowProperty: 'tronLink',
  };
}

// Detect OKX wallet
export function detectOkxWallet(): WalletInfo {
  const isInstalled = !!(window as any).okxwallet;
  return {
    name: 'OKX Wallet',
    isInstalled,
    windowProperty: 'okxwallet',
  };
}

// Detect TokenPocket wallet
export function detectTokenPocket(): WalletInfo {
  const isInstalled = !!(window as any).tokenpocket;
  return {
    name: 'TokenPocket',
    isInstalled,
    windowProperty: 'tokenpocket',
  };
}

// Detect BitKeep wallet
export function detectBitKeep(): WalletInfo {
  const isInstalled = !!(window as any).bitkeep;
  return {
    name: 'BitKeep',
    isInstalled,
    windowProperty: 'bitkeep',
  };
}

// Detect WalletConnect (usually no detection needed as it's a connection protocol)
export function detectWalletConnect(): WalletInfo {
  // WalletConnect doesn't need detection as it's a connection protocol
  return {
    name: 'WalletConnect',
    isInstalled: true,
    windowProperty: undefined,
  };
}

// Get all available wallet information
export function getAllWalletInfo(): WalletInfo[] {
  return [
    detectTronLink(),
    detectOkxWallet(),
    detectTokenPocket(),
    detectBitKeep(),
    detectWalletConnect(),
  ];
}

// Get list of installed wallets
export function getInstalledWallets(): WalletInfo[] {
  return getAllWalletInfo().filter((wallet) => wallet.isInstalled);
}

// Check if a specific wallet is installed
export function isWalletInstalled(walletName: string): boolean {
  const walletInfo = getAllWalletInfo().find(
    (wallet) => wallet.name.toLowerCase() === walletName.toLowerCase()
  );
  return walletInfo?.isInstalled || false;
}

// Wait for wallet to load
export function waitForWallet(walletName: string, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const walletInfo = getAllWalletInfo().find(
      (wallet) => wallet.name.toLowerCase() === walletName.toLowerCase()
    );

    if (!walletInfo || !walletInfo.windowProperty) {
      resolve(false);
      return;
    }

    // If already exists, return directly
    if ((window as any)[walletInfo.windowProperty]) {
      resolve(true);
      return;
    }

    // Set timeout
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, timeout);

    // Listen for wallet loading
    const checkWallet = () => {
      if (walletInfo.windowProperty && (window as any)[walletInfo.windowProperty]) {
        clearTimeout(timeoutId);
        resolve(true);
      } else {
        setTimeout(checkWallet, 100);
      }
    };

    checkWallet();
  });
}
