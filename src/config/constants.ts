import packageJson from '../../package.json';
export const VERSION = packageJson.version;

// Error messages
export const ERROR_MESSAGES = {
  // Network Errors
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT: 'Operation timed out. Please try again.',
  API_ERROR: 'API request failed. Please try again later.',

  // Wallet Errors
  WALLET_NOT_CONNECTED: 'Wallet is not connected. Please connect your wallet first.',
  WALLET_CONNECTION_FAILED: 'Failed to connect wallet',
  WALLET_DISCONNECTION_FAILED: 'Failed to disconnect wallet',
  WALLET_TRANSACTION_FAILED: 'Transaction failed',
  WALLET_SIGNATURE_FAILED: 'Failed to sign transaction. Please try again.',

  // Transaction Errors
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  INSUFFICIENT_BALANCE: 'Insufficient balance for transaction.',
  INVALID_TRANSACTION: 'Invalid transaction parameters.',
  TRANSACTION_TIMEOUT: 'Transaction timed out. Please check the status.',

  // Address Errors
  INVALID_ADDRESS: 'Invalid address format.',
  ADDRESS_NOT_FOUND: 'Address not found.',
  ADDRESS_FETCH_FAILED: 'Failed to fetch addresses.',
  DUPLICATE_ADDRESS: 'Duplicate address detected.',

  // Amount Errors
  INVALID_AMOUNT: 'Invalid amount. Please enter a valid amount.',
  AMOUNT_TOO_SMALL: 'Amount is too small. Minimum amount is 0.000001.',
  AMOUNT_TOO_LARGE: 'Amount is too large. Maximum amount is 1,000,000.',

  // Key Errors
  INVALID_PRIVATE_KEY: 'Invalid private key format.',
  KEY_GENERATION_FAILED: 'Failed to generate key.',
  KEY_IMPORT_FAILED: 'Failed to import key.',

  // Energy Errors
  INSUFFICIENT_ENERGY: 'Insufficient energy for transaction.',
  ENERGY_RENTAL_FAILED: 'Failed to rent energy.',

  // General Errors
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
  VALIDATION_ERROR: 'Validation failed. Please check your input.',
  OPERATION_FAILED: 'Operation failed. Please try again.',

  // Validation Errors
  INVALID_COUNT: 'Invalid count. Please enter a valid number.',
  TOO_MANY_ADDRESSES: 'Too many addresses. Maximum allowed is 1000.',
  TOO_MANY_KEYS: 'Too many keys. Maximum allowed is 100.',

  // Mnemonic Errors
  INVALID_MNEMONIC: 'Invalid mnemonic phrase. Please check and try again.',
  MNEMONIC_GENERATION_FAILED: 'Failed to generate mnemonic phrase.',
  MNEMONIC_IMPORT_FAILED: 'Failed to import mnemonic phrase.',

  WALLET_NOT_FOUND: 'TronLink wallet not found',
};

// merchant API method names constants
export const MERCHANT_API_METHODS = {
  LOGIN: 'auth_login',
  GET_PROFILE: 'kit_get_profile',

  UPLOAD_ADDRESS: 'kit_upload_address',
  QUERY_ADDRESS_USAGE: 'kit_query_address_usage',

  IS_LOCKED_PREFIX: 'kit_is_locked_prefix',
  LOCK_PREFIX: 'kit_lock_prefix',
  UNLOCK_PREFIX: 'kit_unlock_prefix',

  // subscribe
  SUBSCRIBE: 'kit_subscribe_batch',
  UNSUBSCRIBE: 'kit_unsubscribe',

  // history query
  QUERY_COLLECTION_HISTORY: 'kit_query_collection_history',
  QUERY_PAYOUT_HISTORY: 'kit_query_payout_history',

  // payout order confirmed
  PAYOUT_CONFIRMED: 'kit_payout_confermed',
  PAYOUT_ORDERS_CONFIRMED: 'kit_payout_orders_confirmed',
};

// business lock type constants
export const LOCK_TYPES = {
  // collection gas lock
  COLLECTION_GAS: 'collection_gas',

  // payout order lock
  PAYOUT_ORDER: 'payout_order',
} as const;

// minimum payout TRX amount (threshold)
export const MIN_TRX_AMOUNT = 20 * 10 ** 6;
// global TronWeb instance configuration
export const TRONWEB_CONFIG = {
  // default network configuration
  DEFAULT_NETWORK: 'nile' as const,

  // network configuration mapping
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

  // instance cache configuration
  CACHE: {
    ENABLED: true,
    MAX_INSTANCES: 5,
    CLEANUP_INTERVAL: 300000, // 5 minutes clean up once
  },
} as const;

// multi chain config
export const multiChainConfig = [
  {
    chain: 'trx',
    chain_name: 'TRON',
    fullHost: 'https://api.trongrid.io',
    headers: { 'TRON-PRO-API-KEY': 'your-api-key' },
    usdt_contract_address: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
    scan_url: 'https://tronscan.org/#/',
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

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100].map((item) => ({
  value: item.toString(),
  label: `${item} / page`,
}));

// Recharge configuration constants
export const RECHARGE_CONFIG = {
  // TRX recharge amount (20 TRX)
  TRX_RECHARGE_AMOUNT: 20,

  // TRX token address (zero address for native TRX)
  TRX_TOKEN_ADDRESS: '0x0000000000000000000000000000000000000000',

  // Empty bill number constant
  EMPTY_BILL_NO: '0x0000000000000000000000000000000000000000000000000000000000000000',

  // Batch processing size
  BATCH_SIZE: 100,

  // Auto check interval (5 seconds)
  AUTO_CHECK_INTERVAL: 5000,

  // Auto batch processing interval (15 seconds)
  AUTO_BATCH_INTERVAL: 15000,

  // Busy wait interval (1 second when busy)
  BUSY_WAIT_INTERVAL: 1000,

  // Transaction fee limit
  FEE_LIMIT: 500000000,
} as const;

// Status configuration for badges and buttons
export const STATUS_CONFIG = {
  success: {
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    style: { backgroundColor: '#ecfdf5', color: '#15803d', borderColor: '#bbf7d0' },
  },
  warning: {
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    style: { backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fed7aa' },
  },
  error: {
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    style: { backgroundColor: '#fff1f2', color: '#be123c', borderColor: '#fecaca' },
  },
  info: {
    className: 'bg-sky-50 text-sky-700 border border-sky-200',
    style: { backgroundColor: '#f0f9ff', color: '#0c4a6e', borderColor: '#bae6fd' },
  },
  processing: {
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    style: { backgroundColor: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe' },
  },
  pending: {
    className: 'bg-orange-50 text-orange-700 border border-orange-200',
    style: { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' },
  },
  confirming: {
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    style: { backgroundColor: '#ecfdf5', color: '#15803d', borderColor: '#bbf7d0' },
  },
  completed: {
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    style: { backgroundColor: '#ecfdf5', color: '#15803d', borderColor: '#bbf7d0' },
  },
  collecting: {
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    style: { backgroundColor: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe' },
  },
  collectfailed: {
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    style: { backgroundColor: '#fff1f2', color: '#be123c', borderColor: '#fecaca' },
  },
  failed: {
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    style: { backgroundColor: '#fff1f2', color: '#be123c', borderColor: '#fecaca' },
  },
  depositing: {
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    style: { backgroundColor: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe' },
  },
  awaitingdeposit: {
    className: 'bg-orange-50 text-orange-700 border border-orange-200',
    style: { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' },
  },
  collectsuccess: {
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    style: { backgroundColor: '#ecfdf5', color: '#15803d', borderColor: '#bbf7d0' },
  },
  unknown: {
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    style: { backgroundColor: '#fff1f2', color: '#be123c', borderColor: '#fecaca' },
  },
  locked: {
    className: 'bg-red-50 text-red-700 border border-red-200',
    style: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' },
  },
} as const;

// Status button configuration mapping
export const STATUS_BUTTON_CONFIG = {
  success: {
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    outlineClassName: 'text-emerald-700 border-emerald-300 hover:bg-emerald-50',
    ghostClassName: 'text-emerald-700 hover:bg-emerald-50',
  },
  warning: {
    className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    outlineClassName: 'text-amber-700 border-amber-300 hover:bg-amber-50',
    ghostClassName: 'text-amber-700 hover:bg-amber-50',
  },
  error: {
    className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    outlineClassName: 'text-rose-700 border-rose-300 hover:bg-rose-50',
    ghostClassName: 'text-rose-700 hover:bg-rose-50',
  },
  info: {
    className: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
    outlineClassName: 'text-sky-700 border-sky-300 hover:bg-sky-50',
    ghostClassName: 'text-sky-700 hover:bg-sky-50',
  },
  processing: {
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    outlineClassName: 'text-indigo-700 border-indigo-300 hover:bg-indigo-50',
    ghostClassName: 'text-indigo-700 hover:bg-indigo-50',
  },
  pending: {
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    outlineClassName: 'text-orange-700 border-orange-300 hover:bg-orange-50',
    ghostClassName: 'text-orange-700 hover:bg-orange-50',
  },
  completed: {
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    outlineClassName: 'text-emerald-700 border-emerald-300 hover:bg-emerald-50',
    ghostClassName: 'text-emerald-700 hover:bg-emerald-50',
  },
  failed: {
    className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    outlineClassName: 'text-rose-700 border-rose-300 hover:bg-rose-50',
    ghostClassName: 'text-rose-700 hover:bg-rose-50',
  },
} as const;
