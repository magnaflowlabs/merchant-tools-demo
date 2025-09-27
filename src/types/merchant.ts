import type { UserInfo } from '@/types/global';

export interface BaseMessage {
  method: string;
  nonce: string;
  type?: string;
  params?: Record<string, unknown>;
}

export interface ServerResponse<T = unknown> {
  code: number;
  message: string;
  method: string;
  nonce: string;
  data?: T;
  params?: Record<string, unknown>;
}
export interface MerchantLockPayoutOrderResponse {
  status: string;
  type: string;
  chain: string;
  prefixies: string[];
}
export interface PushMessage<T = unknown> {
  type: string;
  data: T;
}

export interface MerchantLoginResponse {
  code: number;
  message: string;
  method: string;
  nonce: string;
  type: string;
  data: {
    token: string;
    user_info: UserInfo;
  };
}

export interface AddressUsageResponse {
  code: number;
  message: string;
  method: string;
  nonce: string;
  data: {
    available: number;
    allocated: number;
    last_path: string;
    last_qr_code: string;
  };
}

export enum PayinOrderStatus {
  Pending = 'Pending',
  Collecting = 'Collecting',
  Confirming = 'Confirming',
  CollectFailed = 'CollectFailed',
  Depositing = 'Depositing',
  AwaitingDeposit = 'AwaitingDeposit',
  CollectSuccess = 'CollectSuccess',
}

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

export interface PayoutOrder {
  bill_no: string;
  to_address: string;
  token: string;
  amount: number;
  decimal: number;
  remark: string;
  status: string;
  block_hash: string;
  block_ms: number;
  block_number: number;
  chain: string;
  confermed: number;
  contract: string;
  created_at: string;
  from: string;
  id: string;
  kind: string;
  merchant_id: string;
  to: string;
  tx_hash: string;
  user_id: string;
  value: string;
}

export interface AddressInfo {
  address: string;
  path: string;
}

export interface ChainInfo {
  chain: string;
  collection_address: string;
  payout_contract_address: string;
  payout_contract_version: string;
}

export interface AddressUsageResponseNew {
  chain: string;
  available: number;
  allocated: number;
  last_path: string;
}

export interface ChainConfig {
  name: string;
  chain: string;
  rpc_url: string;
  tokens: [
    {
      name: string;
      symbol: string;
      contract_addr: string;
      decimal: number;
      payout_contract_addr: string;
      payout_contract_version: string;
    },
  ];
}
