type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/**
 * Sensitive keywords to detect and redact
 */
const SENSITIVE_KEYWORDS = [
  'password',
  'private',
  'privatekey',
  'private_key',
  'privatekeyhex',
  'mnemonic',
  'seed',
  'secret',
  'api_key',
  'apikey',
  'token',
  'access_token',
  'refresh_token',
  'auth_token',
  'authorization',
  'keystore',
  'walletpassword',
  'wallet_password',
];

/**
 * Redaction placeholder
 */
const REDACTED_PLACEHOLDER = '[REDACTED]';

/**
 * Secure logger with sensitive data filtering
 */
class Logger {
  private static instance: Logger;
  private readonly isDevelopment: boolean;
  private readonly isProduction: boolean;
  private readonly logHistory: LogEntry[] = [];
  private readonly maxHistorySize = 100;

  private constructor() {
    // Use import.meta.env for Vite projects
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    this.isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Check if a string contains sensitive information
   */
  private containsSensitiveInfo(str: string): boolean {
    const lowerStr = str.toLowerCase();
    return SENSITIVE_KEYWORDS.some((keyword) => lowerStr.includes(keyword));
  }

  /**
   * Recursively filter sensitive data from objects
   */
  private filterSensitiveData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      if (this.containsSensitiveInfo(data)) {
        return REDACTED_PLACEHOLDER;
      }
      return data;
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.filterSensitiveData(item));
    }

    if (typeof data === 'object') {
      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        // Check if key contains sensitive keywords
        if (this.containsSensitiveInfo(lowerKey)) {
          filtered[key] = REDACTED_PLACEHOLDER;
        } else {
          filtered[key] = this.filterSensitiveData(value);
        }
      }
      return filtered;
    }

    return data;
  }

  /**
   * Filter message string for sensitive information
   */
  private filterMessage(message: string): string {
    if (this.containsSensitiveInfo(message)) {
      // Replace sensitive patterns but keep message structure
      let filtered = message;
      SENSITIVE_KEYWORDS.forEach((keyword) => {
        const regex = new RegExp(keyword, 'gi');
        filtered = filtered.replace(regex, REDACTED_PLACEHOLDER);
      });
      return filtered;
    }
    return message;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    // Filter sensitive data
    const filteredMessage = this.filterMessage(message);
    const filteredData = data ? this.filterSensitiveData(data) : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: filteredMessage,
      data: filteredData,
    };

    // Only log to console in development mode
    if (this.isDevelopment) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](
        `[${entry.timestamp}] ${level.toUpperCase()}: ${filteredMessage}`,
        filteredData || ''
      );
    }

    // Always store in history (for debugging), but with filtered data
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    this.log('error', message, errorData);
  }

  logTransaction(type: string, data: unknown): void {
    this.info(`Transaction: ${type}`, data);
  }

  logWallet(action: string, data: unknown): void {
    this.info(`Wallet: ${action}`, data);
  }

  // get log history (readonly)
  getLogHistory(): readonly LogEntry[] {
    return this.logHistory;
  }

  // clear history record
  clearHistory(): void {
    this.logHistory.length = 0;
  }
}

export const logger = Logger.getInstance();
