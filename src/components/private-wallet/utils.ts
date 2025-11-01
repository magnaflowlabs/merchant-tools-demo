export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function validatePrivateKey(privateKey: string): {
  isValid: boolean;
  cleanedKey: string;
  error?: string;
} {
  if (!privateKey.trim()) {
    return {
      isValid: false,
      cleanedKey: '',
      error: 'Please enter the private key',
    };
  }

  const cleanedKey = privateKey.trim().replace(/^0x/i, '').replace(/\s/g, '');

  if (!/^[0-9a-fA-F]{64}$/.test(cleanedKey)) {
    return {
      isValid: false,
      cleanedKey: '',
      error: 'Private key format is invalid, please enter 64-bit hexadecimal characters',
    };
  }

  return {
    isValid: true,
    cleanedKey,
  };
}
