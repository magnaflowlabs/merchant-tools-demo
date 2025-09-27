export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT: 'Operation timed out. Please try again.',
  API_ERROR: 'API request failed. Please try again later.',

  WALLET_NOT_CONNECTED: 'Wallet is not connected. Please connect your wallet first.',
  WALLET_CONNECTION_FAILED: 'Failed to connect wallet',
  WALLET_DISCONNECTION_FAILED: 'Failed to disconnect wallet',
  WALLET_TRANSACTION_FAILED: 'Transaction failed',
  WALLET_SIGNATURE_FAILED: 'Failed to sign transaction. Please try again.',

  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  INSUFFICIENT_BALANCE: 'Insufficient balance for transaction.',
  INVALID_TRANSACTION: 'Invalid transaction parameters.',
  TRANSACTION_TIMEOUT: 'Transaction timed out. Please check the status.',

  INVALID_ADDRESS: 'Invalid address format.',
  ADDRESS_NOT_FOUND: 'Address not found.',
  ADDRESS_FETCH_FAILED: 'Failed to fetch addresses.',
  DUPLICATE_ADDRESS: 'Duplicate address detected.',

  INVALID_AMOUNT: 'Invalid amount. Please enter a valid amount.',
  AMOUNT_TOO_SMALL: 'Amount is too small. Minimum amount is 0.000001.',
  AMOUNT_TOO_LARGE: 'Amount is too large. Maximum amount is 1,000,000.',

  INVALID_PRIVATE_KEY: 'Invalid private key format.',
  KEY_GENERATION_FAILED: 'Failed to generate key.',
  KEY_IMPORT_FAILED: 'Failed to import key.',

  INSUFFICIENT_ENERGY: 'Insufficient energy for transaction.',
  ENERGY_RENTAL_FAILED: 'Failed to rent energy.',

  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
  VALIDATION_ERROR: 'Validation failed. Please check your input.',
  OPERATION_FAILED: 'Operation failed. Please try again.',

  INVALID_COUNT: 'Invalid count. Please enter a valid number.',
  TOO_MANY_ADDRESSES: 'Too many addresses. Maximum allowed is 1000.',
  TOO_MANY_KEYS: 'Too many keys. Maximum allowed is 100.',

  INVALID_MNEMONIC: 'Invalid mnemonic phrase. Please check and try again.',
  MNEMONIC_GENERATION_FAILED: 'Failed to generate mnemonic phrase.',
  MNEMONIC_IMPORT_FAILED: 'Failed to import mnemonic phrase.',

  WALLET_NOT_FOUND: 'TronLink wallet not found',
};

export const USDT_CONTRACT_ADDRESSES = {
  mainnet: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
  nile: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
};

export const MERCHANT_API_METHODS = {
  LOGIN: 'auth_login',
  GET_PROFILE: 'kit_get_profile',

  UPLOAD_ADDRESS: 'kit_upload_address',
  QUERY_ADDRESS_USAGE: 'kit_query_address_usage',

  LOCK_PREFIX: 'kit_lock_prefix',
  UNLOCK_PREFIX: 'kit_unlock_prefix',

  SUBSCRIBE: 'kit_subscribe_batch',
  UNSUBSCRIBE: 'kit_unsubscribe',
  QUERY_COLLECTION_HISTORY: 'kit_query_collection_history',
  QUERY_PAYOUT_HISTORY: 'kit_query_payout_history',
  PAYOUT_CONFIRMED: 'kit_payout_confermed',
  PAYOUT_ORDERS_CONFIRMED: 'kit_payout_orders_confirmed',
};

export const LOCK_TYPES = {
  COLLECTION_GAS: 'collection_gas',
  PAYOUT_ORDER: 'payout_order',
} as const;

export const MIN_USDT_AMOUNT = 20 * 10 ** 6;
export const MIN_TRX_AMOUNT = 20 * 10 ** 6;
export const TRONWEB_CONFIG = {
  DEFAULT_NETWORK: 'nile' as const,
  NETWORKS: {
    mainnet: {
      fullHost: 'https://api.trongrid.io',
      headers: { 'TRON-PRO-API-KEY': 'your-api-key' },
    },
    nile: {
      fullHost: 'https://nile.trongrid.io',
      headers: { 'TRON-PRO-API-KEY': 'your-api-key' },
    },
  },

  CACHE: {
    ENABLED: true,
    MAX_INSTANCES: 5,
    CLEANUP_INTERVAL: 300000,
  },
} as const;

export const multiChainConfig = [
  {
    chain: 'trx',
    chain_name: 'TRON',
    fullHost: 'https://api.trongrid.io',
    headers: { 'TRON-PRO-API-KEY': 'your-api-key' },
    usdt_contract_address: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
    scan_url: 'https://tronscan.org/#/transaction/',
  },
  {
    chain: 'trx_nil',
    chain_name: 'TRON NILE',
    fullHost: 'https://nile.trongrid.io',
    headers: { 'TRON-PRO-API-KEY': 'your-api-key' },
    usdt_contract_address: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
    scan_url: 'https://nile.tronscan.org/#/',
  },
];
