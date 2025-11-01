// ==================== Enum Definitions ====================

/**
 * Supported blockchain types
 */
export type ChainType = 'trx_nil' | 'trx';

/**
 * Lock status
 */
export type LockStatus = 'lock' | 'unlock';

/**
 * Lock type
 */
export type LockType = 'collection_gas' | 'payout_order';

/**
 * Payin order status
 */
export enum PayinOrderStatus {
  Pending = 'Pending',
  Locked = 'Locked',
  Collecting = 'Collecting',
  Confirming = 'Confirming',
  CollectFailed = 'Failed',
}

// ==================== Response Types ====================

/**
 * Merchant lock payout order response
 */
export interface MerchantLockPayoutOrderResponse {
  status: string;
  type: string;
  chain: string;
  prefixies: string[];
}

// ==================== Order Types ====================

/**
 * Payin order
 */
export interface PayinOrder {
  id: number;
  merchant_id: string;
  user_id: string;
  address: string;
  path: string;
  chain: string;
  token_id: string;
  value: number;
  usdt: number;
  remark: string;
  status?: PayinOrderStatus;
  block_number?: number;
  block_ms: number;
  created_at: string;
  txhash?: string;
  confirmations?: number;
  updated_at?: string;
}

/**
 * Payout order
 */
export interface PayoutOrder {
  bill_no: string;
  token: string;
  amount: string;
  remark: string;
  status: string;
  block_hash: string;
  block_ms: number;
  block_number: number;
  chain: string;
  created_at: string;
  from: string;
  id: string;
  merchant_id: string;
  to: string;
  tx_hash: string;
  value: string;
}

// ==================== Address-Related Types ====================

/**
 * Address information
 */
export interface AddressInfo {
  address: string;
  path: string;
}

/**
 * Collection address information
 */
export interface CollectionAddressInfo {
  chain: string;
  collection_address: string;
  payout_contract_address: string;
  payout_contract_version: string;
}

/**
 * Address usage
 */
export interface AddressUsage {
  chain: string;
  available: number;
  allocated: number;
  last_path: string;
}

// ==================== Blockchain Configuration ====================

/**
 * Token configuration
 */
export interface TokenConfig {
  name: string;
  symbol: string;
  contract_addr: string;
  decimal: number;
  payout_contract_addr: string;
  payout_contract_version: string;
}

/**
 * Chain configuration
 */
export interface ChainConfig {
  name: string;
  chain: string;
  rpc_url: string;
  scan_url?: string;
  tokens: TokenConfig[];
}
