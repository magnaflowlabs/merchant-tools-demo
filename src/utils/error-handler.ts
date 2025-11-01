/**
 * Secure error handling utilities
 * Prevents information leakage in production environments
 */

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

/**
 * Generic error messages for production
 */
const GENERIC_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please try again.',
  VALIDATION_ERROR: 'Invalid input. Please check your information.',
  AUTH_ERROR: 'Authentication failed. Please check your credentials.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An error occurred. Please try again.',
  OPERATION_FAILED: 'Operation failed. Please try again.',
} as const;

/**
 * Error types that are safe to show to users
 */
const SAFE_ERROR_PATTERNS = [
  /^invalid/i,
  /^missing/i,
  /^required/i,
  /^please/i,
  /^cannot/i,
  /^insufficient/i,
] as const;

/**
 * Check if an error message is safe to display to users
 */
function isSafeError(message: string): boolean {
  return SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitize error message for display
 * - In production: Returns generic messages to prevent information leakage
 * - In development: Returns detailed error messages
 */
export function sanitizeErrorMessage(error: unknown, context?: string): string {
  if (!error) {
    return GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  // In development, show more details
  if (!isProduction) {
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      if (errorObj.message) {
        return String(errorObj.message);
      }
      if (errorObj.error) {
        return String(errorObj.error);
      }
    }
    return JSON.stringify(error);
  }

  // In production, use generic messages
  let errorMessage = '';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    if (errorObj.message) {
      errorMessage = String(errorObj.message);
    } else if (errorObj.error) {
      errorMessage = String(errorObj.error);
    }
  }

  // Check if error message is safe to display
  if (errorMessage && isSafeError(errorMessage)) {
    return errorMessage;
  }

  // Map error types to generic messages
  const lowerMessage = errorMessage.toLowerCase();

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection')
  ) {
    return GENERIC_ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('format')
  ) {
    return GENERIC_ERROR_MESSAGES.VALIDATION_ERROR;
  }

  if (
    lowerMessage.includes('auth') ||
    lowerMessage.includes('login') ||
    lowerMessage.includes('password') ||
    lowerMessage.includes('token') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden')
  ) {
    return GENERIC_ERROR_MESSAGES.AUTH_ERROR;
  }

  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('denied') ||
    lowerMessage.includes('access')
  ) {
    return GENERIC_ERROR_MESSAGES.PERMISSION_ERROR;
  }

  if (
    lowerMessage.includes('server') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('503')
  ) {
    return GENERIC_ERROR_MESSAGES.SERVER_ERROR;
  }

  // Default to generic error
  return GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Extract error code safely
 */
export function getErrorCode(error: unknown): string | null {
  if (!isProduction) {
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      if (errorObj.code) {
        return String(errorObj.code);
      }
      if (errorObj.status) {
        return String(errorObj.status);
      }
    }
  }
  return null;
}

/**
 * Check if error should be logged (for internal debugging)
 */
export function shouldLogError(error: unknown): boolean {
  // Always log errors internally, but don't expose details to users
  return true;
}

/**
 * Get stack trace safely (only in development)
 */
export function getSafeStackTrace(error: unknown): string | null {
  if (!isProduction && error instanceof Error && error.stack) {
    // Sanitize stack trace - remove file paths if needed
    return error.stack.replace(/file:\/\/\/[^\s]+/g, '[redacted]');
  }
  return null;
}
