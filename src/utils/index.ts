import BigNumber from 'bignumber.js';

export function formatNumber(num: number | string): string {
  const bigNum = new BigNumber(num);
  const [integer, dec = ''] = bigNum.toFixed().split('.');
  const formattedInt = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (!dec || /^0+$/.test(dec)) {
    return formattedInt;
  }

  const trimmedDecimal = dec.replace(/0+$/, '');
  return `${formattedInt}.${trimmedDecimal}`;
}

export const strip0x = (hash: string): string => {
  return hash.startsWith('0x') ? hash.substring(2) : hash;
};

const WS_MERCHANT_ID_REGEX = /\/ws\/([^/]+)/;

/**
 * Extract Merchant ID (deprecated, please use extractAndValidateMerchantId from url-sanitizer)
 * @deprecated Use extractAndValidateMerchantId instead, it includes security validation
 */
export const extractMerchantId = (url: string): string | null => {
  const match = url.match(WS_MERCHANT_ID_REGEX);
  return match ? match[1] : null;
};

/**
 * Check if error is from user actively cancelling wallet operation
 * @param error - Error object or error message
 * @returns Returns true if user cancelled operation, otherwise returns false
 */
export const isUserCancelledError = (error: unknown): boolean => {
  if (!error) return false;

  // Convert error to string for matching
  const errorMessage =
    typeof error === 'string'
      ? error.toLowerCase()
      : (error as Error)?.message?.toLowerCase() || JSON.stringify(error).toLowerCase();
  // Common user cancel operation error keywords
  const cancelKeywords = [
    'confirmation declined by user',
    'user rejected',
    'user denied',
    'user cancelled',
    'user canceled',
    'user reject',
    'rejected by user',
    'declined by user',
    'denied by user',
    'cancelled by user',
    'canceled by user',
    'user decline',
    'transaction was rejected',
    'signature request declined',
    'signature rejected',
    'transaction declined',
    'user disapproved',
    'request rejected',
    'action_rejected',
    'user_rejected',
    'user_cancelled',
  ];

  // Check if error message contains any cancel keywords
  return cancelKeywords.some((keyword) => errorMessage.includes(keyword));
};

/**
 * Get friendly error message
 * Uses secure error handling to prevent information leakage
 * @param error - Error object or error message
 * @returns Friendly error message (sanitized in production)
 */
export const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Unknown error';

  // Check if user cancelled operation
  if (isUserCancelledError(error)) {
    return 'User cancelled the operation';
  }

  // Use secure error handler with direct import
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { sanitizeErrorMessage } = require('./error-handler');
  return sanitizeErrorMessage(error);
};
