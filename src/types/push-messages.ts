import type {
  PayinOrder,
  PayoutOrder,
  ChainType,
  LockStatus,
  LockType,
  AddressUsage,
} from './merchant';

// ==================== Base Push Messages ====================

/**
 * Base push message interface
 */
export interface BasePushMessage {
  method: string;
  type: 'push';
  nonce: string;
  data: any;
}

// ==================== Lock Information Types ====================

/**
 * Lock information
 */
export interface LockInfo {
  status: LockStatus;
  type: LockType;
  prefixies: string[];
}

// ==================== Specific Push Message Types ====================

/**
 * Collection orders push message
 */
export interface CollectionOrdersPushMessage extends BasePushMessage {
  method: 'kit_collection_orders';
  data: {
    chain: ChainType;
    total_records: number;
    list: PayinOrder[];
  };
}

/**
 * Payout orders push message
 */
export interface PayoutOrdersPushMessage extends BasePushMessage {
  method: 'kit_payout_orders';
  data: {
    chain: ChainType;
    total_records: number;
    list: PayoutOrder[];
  };
}

/**
 * Lock status push message
 */
export interface LocksPushMessage extends BasePushMessage {
  method: 'kit_locks';
  data: {
    total_records: number;
    list: LockInfo[];
  };
}

/**
 * Address usage push message
 */
export interface AddressUsagePushMessage extends BasePushMessage {
  method: 'kit_address_usage';
  data: {
    chain: ChainType;
    total_records: number;
    list: AddressUsage[];
  };
}

/**
 * Authentication terminated push message
 */
export interface AuthTerminatedPushMessage extends BasePushMessage {
  method: 'auth_terminated';
  data: {
    reason: string;
    message: string;
    terminated_at: string;
  };
}

// ==================== Union Types ====================

/**
 * Union type of all push messages
 */
export type PushMessage =
  | CollectionOrdersPushMessage
  | PayoutOrdersPushMessage
  | LocksPushMessage
  | AddressUsagePushMessage
  | AuthTerminatedPushMessage;

// ==================== Handler Types ====================

/**
 * Push message handler
 */
export type PushMessageHandler<T extends PushMessage = PushMessage> = (message: T) => void;

/**
 * Push message handler mapping
 */
export interface PushMessageHandlers {
  kit_collection_orders?: PushMessageHandler<CollectionOrdersPushMessage>;
  kit_payout_orders?: PushMessageHandler<PayoutOrdersPushMessage>;
  kit_locks?: PushMessageHandler<LocksPushMessage>;
  kit_address_usage?: PushMessageHandler<AddressUsagePushMessage>;
  auth_terminated?: PushMessageHandler<AuthTerminatedPushMessage>;
  [key: string]: PushMessageHandler<any> | undefined;
}
