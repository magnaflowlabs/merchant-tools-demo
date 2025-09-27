import type { PayinOrder, PayoutOrder } from './merchant';
export interface BasePushMessage {
  method: string;
  type: 'push';
  nonce: string;
  data: any;
}

export interface CollectionOrdersPushMessage extends BasePushMessage {
  method: 'kit_collection_orders';
  data: {
    chain: 'trx_nil' | 'trx';
    total_records: number;
    list: PayinOrder[];
  };
}

export interface PayoutOrdersPushMessage extends BasePushMessage {
  method: 'kit_payout_orders';
  data: {
    chain: 'trx_nil' | 'trx';
    total_records: number;
    list: PayoutOrder[];
  };
}

export interface LocksPushMessage extends BasePushMessage {
  method: 'kit_locks';
  data: {
    total_records: number;
    list: Array<{
      status: 'lock' | 'unlock';
      type: 'collection_gas' | 'payout_order';
      prefixies: string[];
    }>;
  };
}

export interface AddressUsagePushMessage extends BasePushMessage {
  method: 'kit_address_usage';
  data: {
    chain: 'trx_nil' | 'trx';
    total_records: number;
    list: Array<{
      available: number;
      allocated: number;
      last_path: string;
    }>;
  };
}

export interface AuthTerminatedPushMessage extends BasePushMessage {
  method: 'auth_terminated';
  data: {
    reason: string;
    message: string;
    terminated_at: string;
  };
}

export type PushMessage =
  | CollectionOrdersPushMessage
  | PayoutOrdersPushMessage
  | LocksPushMessage
  | AddressUsagePushMessage
  | AuthTerminatedPushMessage;

export type PushMessageHandler<T extends PushMessage = PushMessage> = (message: T) => void;

export interface PushMessageHandlers {
  kit_collection_orders?: PushMessageHandler<CollectionOrdersPushMessage>;
  kit_payout_orders?: PushMessageHandler<PayoutOrdersPushMessage>;
  kit_locks?: PushMessageHandler<LocksPushMessage>;
  kit_address_usage?: PushMessageHandler<AddressUsagePushMessage>;
  auth_terminated?: PushMessageHandler<AuthTerminatedPushMessage>;
  [key: string]: PushMessageHandler<any> | undefined;
}

export function isPushMessage(data: any): data is BasePushMessage {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.method === 'string' &&
    data.type === 'push' &&
    typeof data.nonce === 'string' &&
    data.data !== undefined
  );
}
