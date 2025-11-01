import type { CollectionAddressInfo } from '@/types/merchant';
export type AuthLoginArgs = {
  username: string;
  password: string;
};
export type PayoutHistory = {
  id: string;
  user_id: string;
  from: string;
  to: string;
  token: string;
  amount: string;
  decimal: number;
  status: string;
  tx_hash: string;
  remark: string;
  timestamp: string;
  block_ms: string;
  bill_no: string;
};

export type CollectionHistory = {
  id: string;
  from: string;
  to: string;
  amount: number;
  token: string;
  status: string;
  txhash: string;
  block_ms: string;
  user_id: string;
};

export interface UserInfo {
  user_id: string;
  username: string;
  role: string;
  merchant_id: string;
}
export type AuthLoginRes = {
  token: string;
  user_info: UserInfo;
};
export type AuthPasskeyVerifyFinishRes = {
  success: boolean;
  error: string;
  code: number;
  data: AuthLoginRes;
};
export type AuthBindArgs = {
  token: string;
};

export enum NextAction {
  PASSWORD_REQUIRED = 'password_required',
  PASSKEY_REQUIRED = 'passkey_required',
}

export type AuthPasskeyRegisterArgs = {
  credential_id: string;
  public_key: string;
  attestation_object: string;
  client_data_json: string;
};

export type AuthPasskeyVerifyFinishArgs = {
  credential_id: string;
  authenticator_data: string;
  client_data_json: string;
  signature: string;
};
export type MerchantProfile = {
  merchant_id: string;
  conn_url: string;
  api_url: string;
  collection_addresses: CollectionAddressInfo[];
  re_url: string;
  admin_passwd: string;
  merchant_gpg_pub: string;
  server_gpg_pub: string;
  keystore_id?: string;
};

export type PayoutHistoryParams = {
  page_number: number;
  page_size: number;
  filters: {
    chain: string;
    status?: string;
    order_id?: string;
    to_address?: string;
    token?: string;
    start_time?: string;
    end_time?: string;
  };
  sort_by?: string;
  sort_order?: string;
};

export type PayoutHistoryResponse = {
  page_number: number;
  page_size: number;
  total_records: number;
  list: PayoutHistory[];
  chain: string;
};

export type CollectionHistoryParams = {
  page_number: number;
  page_size: number;
  filters: {
    chain: string;
    status?: string;
    from_address?: string;
    to_address?: string;
    start_time?: string;
    end_time?: string;
  };
  sort_by?: string;
  sort_order?: string;
};

export type CollectionHistoryResponse = {
  page_number: number;
  page_size: number;
  total_records: number;
  list: CollectionHistory[];
  chain: string;
};
