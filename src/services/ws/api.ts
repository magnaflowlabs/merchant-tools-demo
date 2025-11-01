import { WebSocketService } from '@/utils/ws/WebSocketService';
import type {
  AuthBindArgs,
  AuthLoginArgs,
  AuthLoginRes,
  AuthPasskeyRegisterArgs,
  AuthPasskeyVerifyFinishArgs,
  MerchantProfile,
  PayoutHistoryParams,
  PayoutHistoryResponse,
  CollectionHistoryParams,
  CollectionHistoryResponse,
} from './type';
import type {
  AddressInfo,
  AddressUsage,
  ChainConfig,
  MerchantLockPayoutOrderResponse,
} from '@/types/merchant';
import { MERCHANT_API_METHODS, LOCK_TYPES } from '@/config/constants';
export const wsService = new WebSocketService();
// ------------------------------------------------------------
export const authLogin = (args: AuthLoginArgs) =>
  wsService.sendRequest<AuthLoginRes>('auth_login', args);
export const authBind = (args: AuthBindArgs) =>
  wsService.sendRequest<AuthLoginRes>('auth_bind', args);

export const passkeyVerifyStart = () =>
  wsService.sendRequest<AuthLoginRes>('passkey_verify_start', {});
export const passkeyRegister = (args: AuthPasskeyRegisterArgs) =>
  wsService.sendRequest<AuthLoginRes>('passkey_register', args);
export const passkeyVerifyFinish = (args: AuthPasskeyVerifyFinishArgs) =>
  wsService.sendRequest<AuthLoginRes>('passkey_verify_finish', args);

export const kitGetProfile = () => wsService.sendRequest<MerchantProfile>('kit_get_profile', {});

export const adminGetChainConfigs = () =>
  wsService.sendRequest<{
    chain_configs: ChainConfig[];
  }>('get_chain_configs', {});

export const kitUpdateProfile = (args: { keystore_id: string }) =>
  wsService.sendRequest('kit_update_profile', args);

// auto subscribe
export const autoSubscribe = (args: { chain: string; events: string[] }) =>
  wsService.sendRequest('kit_subscribe_batch', args);

export const queryCollectionHistory = (args: CollectionHistoryParams) =>
  wsService.sendRequest<CollectionHistoryResponse>('kit_query_collection_history', args);

export const queryPayoutHistory = (args: PayoutHistoryParams) =>
  wsService.sendRequest<PayoutHistoryResponse>('kit_query_payout_history', args);

export const lockCollectionGas = (args: { prefixes: string[] }) =>
  wsService.sendRequest('kit_lock_collection_gas', args);

export const unlockCollectionGas = (args: { prefixes: string[] }) =>
  wsService.sendRequest('kit_unlock_collection_gas', args);

export const lockPayoutOrder = (args: { prefixes: string[] }) =>
  wsService.sendRequest('kit_lock_payout_order', args);

export const unlockPayoutOrder = (args: { prefixes: string[] }) =>
  wsService.sendRequest('kit_unlock_payout_order', args);

export const subscribePayinOrders = (args: { chain: string; usdtThod: string }) =>
  wsService.sendRequest('kit_subscribe_payin_orders', args);

export const subscribePayoutOrders = (args: { chain: string }) =>
  wsService.sendRequest('kit_subscribe_payout_orders', args);

export const unsubscribe = (args: { chain: string; events: string[] }) =>
  wsService.sendRequest('kit_unsubscribe_batch', args);

export const unsubscribePayinOrders = (args: { chain: string; events: string[] }) =>
  wsService.sendRequest('kit_unsubscribe_payin_orders', args);

export const queryAddressUsage = (args: { chain: string }) =>
  wsService.sendRequest<AddressUsage>('kit_query_address_usage', args);

// upload addresses
export const uploadAddresses = (args: { chain: string; addresses: AddressInfo[] }) => {
  return wsService.sendRequest<AddressUsage>('kit_upload_address', args);
};

export const merchantIsLockedPayoutOrder = (prefixes: string[], chain: string) => {
  return wsService.sendRequest<MerchantLockPayoutOrderResponse>(
    MERCHANT_API_METHODS.IS_LOCKED_PREFIX,
    {
      type: LOCK_TYPES.PAYOUT_ORDER,
      prefixies: prefixes,
      chain: chain,
    }
  );
};
export const merchantLockPayoutOrder = (prefixes: string[], chain: string) => {
  return wsService.sendRequest<MerchantLockPayoutOrderResponse>(MERCHANT_API_METHODS.LOCK_PREFIX, {
    type: LOCK_TYPES.PAYOUT_ORDER,
    prefixies: prefixes,
    chain: chain,
  });
};

export const merchantUnlockPayoutOrder = (prefixes: string[], chain: string) => {
  return wsService.sendRequest<MerchantLockPayoutOrderResponse>(
    MERCHANT_API_METHODS.UNLOCK_PREFIX,
    {
      type: LOCK_TYPES.PAYOUT_ORDER,
      prefixies: prefixes,
      chain: chain,
    }
  );
};
export const merchantIsLockedRechargeOrder = (prefixes: string[], chain: string) => {
  return wsService.sendRequest<MerchantLockPayoutOrderResponse>(
    MERCHANT_API_METHODS.IS_LOCKED_PREFIX,
    {
      type: LOCK_TYPES.COLLECTION_GAS,
      prefixies: prefixes,
      chain: chain,
    }
  );
};
export const merchantLockRechargeOrder = (prefixes: string[], chain: string) => {
  return wsService.sendRequest<MerchantLockPayoutOrderResponse>(MERCHANT_API_METHODS.LOCK_PREFIX, {
    type: LOCK_TYPES.COLLECTION_GAS,
    prefixies: prefixes,
    chain: chain,
  });
};

export const merchantUnlockRechargeOrder = (prefixes: string[], chain: string) => {
  return wsService.sendRequest<MerchantLockPayoutOrderResponse>(
    MERCHANT_API_METHODS.UNLOCK_PREFIX,
    {
      type: LOCK_TYPES.COLLECTION_GAS,
      prefixies: prefixes,
      chain: chain,
    }
  );
};
