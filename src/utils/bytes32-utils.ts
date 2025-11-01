export function stringToBytes32(str: string): string {
  if (!str) {
    throw new Error('String cannot be empty');
  }
  const bytesHex = Buffer.from(str).toString('hex');
  return '0x' + bytesHex.padEnd(64, '0');
}

export function validateBytes32(value: string): string {
  const regex = /^[0-9a-fA-F]{64}$/;
  if (!regex.test(value)) {
    throw new Error(`bytes32 (need 64 hex characters): ${value}`);
  }
  return value;
}
