export interface GenericServerResponse<Data = unknown> {
  code: number;
  message?: string;
  method?: string;
  nonce?: string;
  data?: Data;
  type?: string;
}

export interface UserInfo {
  user_id: string;
  username: string;
  role: string;
  merchant_id: string;
}

export interface PasskeyVerifyStartData {
  challenge: string;
  rp_name: string;
  user_id: string;
  registered_ids?: string[];
}

export interface PasskeyVerifyFinishParams {
  credential_id: string;
  authenticator_data: string;
  client_data_json: string;
  signature: string;
}

export interface PasskeyVerifyFinishData {
  token: string;
  user_info: UserInfo;
}

export interface PasskeyRegisterParams {
  credential_id: string;
  public_key?: string;
  attestation_object: string;
  client_data_json: string;
}
