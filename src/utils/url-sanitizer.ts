/**
 * URL parameter sanitization and security validation tool
 * Prevents URL injection attacks
 */

/**
 * Maximum URL length limit (2048 characters, recommended by RFC 7231)
 */
const MAX_URL_LENGTH = 2048;

/**
 * Maximum parameter value length
 */
const MAX_PARAM_VALUE_LENGTH = 500;

/**
 * Allowed username character set: letters, numbers, underscores, hyphens, dots
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * Allowed merchant ID character set: letters, numbers, underscores, hyphens
 */
const MERCHANT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * WebSocket URL pattern validation
 */
const WS_URL_PATTERN = /^wss?:\/\/.+/;

/**
 * Sanitize string, remove potentially dangerous characters
 * @param input - Input string
 * @param maxLength - Maximum length
 * @returns Sanitized string or null (if invalid)
 */
export function sanitizeString(
  input: string | null,
  maxLength: number = MAX_PARAM_VALUE_LENGTH
): string | null {
  if (!input) return null;

  // Remove whitespace
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check length
  if (trimmed.length > maxLength) return null;

  // Remove control characters (except common whitespace characters)
  const cleaned = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove HTML entities and script tags
  const withoutHtml = cleaned
    .replace(/&[#\w]+;/g, '') // Remove HTML entities
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers

  return withoutHtml.length > 0 ? withoutHtml : null;
}

/**
 * Validate username format
 * @param username - Username
 * @returns Whether valid
 */
export function validateUsername(username: string | null): boolean {
  if (!username) return false;
  const sanitized = sanitizeString(username, MAX_PARAM_VALUE_LENGTH);
  if (!sanitized) return false;

  // Check character set
  if (!USERNAME_PATTERN.test(sanitized)) return false;

  // Length limit
  if (sanitized.length < 1 || sanitized.length > 100) return false;

  return true;
}

/**
 * Safely get value from URL parameter
 * @param paramValue - URL parameter value
 * @param validator - Optional validation function
 * @returns Sanitized value or null
 */
export function getSafeUrlParam(
  paramValue: string | null,
  validator?: (value: string) => boolean
): string | null {
  if (!paramValue) return null;

  // Decode first
  let decoded: string;
  try {
    decoded = decodeURIComponent(paramValue);
  } catch {
    // If decoding fails, return null
    return null;
  }

  // Sanitize
  const sanitized = sanitizeString(decoded);
  if (!sanitized) return null;

  // Apply custom validator
  if (validator && !validator(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validate WebSocket URL format
 * @param url - WebSocket URL
 * @returns Whether valid
 */
export function validateWebSocketUrl(url: string | null): {
  isValid: boolean;
  error?: string;
} {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  // Check length
  if (url.length > MAX_URL_LENGTH) {
    return { isValid: false, error: 'URL too long' };
  }

  // Check protocol
  if (!WS_URL_PATTERN.test(url)) {
    return { isValid: false, error: 'Invalid WebSocket URL protocol' };
  }

  // Try to parse URL
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Validate protocol
  if (!/^wss?:$/.test(urlObj.protocol)) {
    return { isValid: false, error: 'Only ws:// or wss:// protocols are allowed' };
  }

  // Validate hostname is not empty
  if (!urlObj.hostname || urlObj.hostname.length === 0) {
    return { isValid: false, error: 'URL must contain a hostname' };
  }

  // Check hostname format (prevent special character injection)
  if (!/^[a-zA-Z0-9.-]+$/.test(urlObj.hostname)) {
    return { isValid: false, error: 'Invalid hostname format' };
  }

  return { isValid: true };
}

/**
 * Validate and extract Merchant ID
 * @param url - WebSocket URL
 * @returns Merchant ID or null
 */
export function extractAndValidateMerchantId(url: string | null): string | null {
  if (!url) return null;

  const wsUrlValidation = validateWebSocketUrl(url);
  if (!wsUrlValidation.isValid) return null;

  try {
    // Extract merchant ID using regex
    const WS_MERCHANT_ID_REGEX = /\/ws\/([^/?#]+)/;
    const match = url.match(WS_MERCHANT_ID_REGEX);
    if (!match || !match[1]) return null;

    const merchantId = match[1];

    // Validate merchant ID format
    if (!MERCHANT_ID_PATTERN.test(merchantId)) return null;

    // Length limit
    if (merchantId.length < 1 || merchantId.length > 100) return null;

    return merchantId;
  } catch {
    return null;
  }
}

/**
 * Complete WebSocket URL validation (including merchant ID)
 * @param url - WebSocket URL
 * @returns Validation result
 */
export function validateCompleteWebSocketUrl(url: string | null): {
  isValid: boolean;
  error?: string;
  merchantId?: string;
} {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  // Base URL validation
  const baseValidation = validateWebSocketUrl(url);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // Extract and validate merchant ID
  const merchantId = extractAndValidateMerchantId(url);
  if (!merchantId) {
    return { isValid: false, error: 'Merchant ID not found or invalid' };
  }

  return {
    isValid: true,
    merchantId,
  };
}
