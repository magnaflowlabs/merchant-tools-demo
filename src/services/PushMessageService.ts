/**
 * Push Message Service
 * Handles WebSocket push message business logic
 */

import { PayoutOrderStatus } from '@/stores/order-store';
import type {
  PushMessage,
  PushMessageHandlers,
  CollectionOrdersPushMessage,
  PayoutOrdersPushMessage,
  LocksPushMessage,
  AddressUsagePushMessage,
  AuthTerminatedPushMessage,
} from '@/types/push-messages';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { EventEmitter } from '@/utils/ws/core/event';
import { useMerchantStore } from '@/stores/merchant-store';
import { useSyncConfigStore } from '@/stores/sync-config-store';
import { useOrderStore } from '@/stores/order-store';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { wsService } from '@/services/ws';
import type { PayinOrder, PayoutOrder } from '@/types/merchant';
import { PayinOrderStatus } from '@/types/merchant';
/**
 * Order batch processing manager
 * Merge consecutive pushes into one update to reduce render count
 */
class OrderBatcher {
  private payoutOrdersBatch: PayoutOrder[] = [];
  private payinOrdersBatch: PayinOrder[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly DELAY = 200; // 200ms delay
  private readonly MAX_SIZE = 300; // Maximum batch size

  reset() {
    // Drop any pending batches and cancel scheduled flush to avoid writing stale data after clear
    this.payoutOrdersBatch = [];
    this.payinOrdersBatch = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  addPayoutOrders(orders: PayoutOrder[]) {
    this.payoutOrdersBatch.push(...orders);

    // Reach maximum batch size, submit immediately
    if (this.payoutOrdersBatch.length >= this.MAX_SIZE) {
      this.flushPayoutOrders();
      return;
    }

    // Otherwise delay submission
    this.scheduleFlush();
  }

  addPayinOrders(orders: PayinOrder[]) {
    this.payinOrdersBatch.push(...orders);

    if (this.payinOrdersBatch.length >= this.MAX_SIZE) {
      this.flushPayinOrders();
      return;
    }

    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flushPayoutOrders();
      this.flushPayinOrders();
    }, this.DELAY);
  }

  private flushPayoutOrders() {
    if (this.payoutOrdersBatch.length > 0) {
      useOrderStore.getState().addPayoutOrders(this.payoutOrdersBatch);
      this.payoutOrdersBatch = [];
    }
  }

  private flushPayinOrders() {
    if (this.payinOrdersBatch.length > 0) {
      useOrderStore.getState().addPayinOrders(this.payinOrdersBatch);
      this.payinOrdersBatch = [];
    }
  }
}

const orderBatcher = new OrderBatcher();

export function resetOrderBatcher() {
  orderBatcher.reset();
}

export class PushMessageService extends EventEmitter {
  private handlers: PushMessageHandlers = {};

  constructor() {
    super();
  }

  /**
   * Register push message handler
   */
  registerHandler<T extends PushMessage>(method: T['method'], handler: (message: T) => void): void {
    this.handlers[method] = handler as any;
  }

  /**
   * Remove push message handler
   */
  unregisterHandler(method: string): void {
    delete this.handlers[method];
  }

  /**
   * Handle push message
   */
  handlePushMessage(message: any): void {
    if (!this.isPushMessage(message)) {
      console.warn('Received non-push message:', message);
      return;
    }

    const handler = this.handlers[message.method];
    if (handler) {
      try {
        (handler as any)(message);
        this.emit('push_message_handled', { method: message.method, success: true });
      } catch (error) {
        console.error(`Failed to handle push message [${message.method}]:`, error);
        this.emit('push_message_error', { method: message.method, error });
      }
    } else {
      console.warn(`No push message handler found: ${message.method}`);
      this.emit('push_message_unhandled', { method: message.method });
    }
  }

  /**
   * Validate if data is a push message
   */
  private isPushMessage(data: any): data is PushMessage {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.method === 'string' &&
      data.type === 'push' &&
      typeof data.nonce === 'string' &&
      data.data !== undefined
    );
  }

  /**
   * Get list of registered handlers
   */
  getRegisteredHandlers(): string[] {
    return Object.keys(this.handlers);
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers = {};
  }
}

// Default push message handler implementation
export class DefaultPushMessageHandlers {
  /**
   * Handle collection orders push (using batch processing)
   */
  static handleCollectionOrders(message: CollectionOrdersPushMessage): void {
    const { list } = message.data;
    if (Boolean(list?.length)) {
      if (list[0].chain === useChainConfigStore.getState().curChainConfig.chain) {
        DefaultPushMessageHandlers.handlePayinOrders(list);
      }
    }
  }

  /**
   * Handle collection order data (using batch processing)
   */
  static handlePayinOrders(collectionDatas: PayinOrder[]): void {
    // Use batch processing instead of immediate update
    orderBatcher.addPayinOrders(collectionDatas);
  }

  /**
   * Handle payout orders push (using batch processing)
   */
  static handlePayoutOrders(message: PayoutOrdersPushMessage): void {
    const { list } = message.data;
    if (
      Boolean(list?.length) &&
      list[0].chain === useChainConfigStore.getState().curChainConfig.chain
    ) {
      orderBatcher.addPayoutOrders(list);
    }
  }

  /**
   * Handle lock status push
   */
  static handleLocks(message: LocksPushMessage): void {
    const { list } = message.data;
    const orderStore = useOrderStore.getState();

    const payinOrderStatusStore = usePayinOrderStatusStore.getState();
    const lockData = list[0];
    if (Boolean(lockData?.prefixies?.length)) {
      if (lockData.type === 'payout_order') {
        // Filter out existing order prefixes
        const existingPrefixes = lockData.prefixies.filter((prefix) =>
          orderStore.payoutOrders.has(prefix)
        );

        if (existingPrefixes.length > 0) {
          if (lockData.status === 'lock') {
            orderStore.updatePayoutOrdersStatus(existingPrefixes, {
              status: PayoutOrderStatus.Locked,
              isLocked: true,
            });
          } else if (lockData.status === 'unlock') {
            orderStore.updatePayoutOrdersStatus(existingPrefixes, {
              status: PayoutOrderStatus.Pending,
              isLocked: false,
            });
          }
        }
      } else {
        if (lockData.type === 'collection_gas') {
          // Filter out existing order prefixes
          const existingPrefixes = lockData.prefixies.filter((prefix) =>
            orderStore.rechargeOrders.has(prefix)
          );

          if (existingPrefixes.length > 0) {
            existingPrefixes.forEach((prefix) => {
              payinOrderStatusStore.setOrderStatus(
                prefix,
                lockData.status === 'lock' ? PayinOrderStatus.Locked : PayinOrderStatus.Pending
              );
            });
          }
        }
      }
    }
  }

  /**
   * Handle address usage push
   */
  static handleAddressUsage(message: AddressUsagePushMessage): void {
    const merchantStore = useMerchantStore.getState();
    const syncConfigStore = useSyncConfigStore.getState();
    const { chain, list } = message.data;

    if (list.length > 0) {
      if (syncConfigStore.isExecutingSync) {
        return;
      }
      const curChainConfig = useChainConfigStore.getState().curChainConfig;
      if (chain === curChainConfig.chain) {
        merchantStore.updateAddressUsage(list[0]);
      }
    }
  }

  /**
   * Handle forced logout push
   */
  static handleAuthTerminated(message: AuthTerminatedPushMessage): void {
    const { reason, message: reasonMessage, terminated_at } = message.data;

    // Log termination info if needed

    // Trigger forced logout event
    const event = new CustomEvent('auth_terminated', {
      detail: {
        reason,
        message: reasonMessage,
        terminated_at,
        timestamp: Date.now(),
      },
    });

    // Dispatch to global event
    window.dispatchEvent(event);

    // Execute forced logout operation
    DefaultPushMessageHandlers.performForcedLogout(reason, reasonMessage);
  }

  /**
   * Execute forced logout operation
   */
  static performForcedLogout(reason: string, message: string): void {
    // Use static imports since there are no circular dependencies
    const authStore = useAuthStore.getState();
    const appStore = useAppStore.getState();

    appStore.addNotification({
      type: 'error',
      title: 'Session Terminated',
      message: message || 'Your session has been bound elsewhere, please log in again',
    });

    wsService.disconnect();
    authStore.logout();

    setTimeout(() => {
      window.location.href = './login';
    }, 100);
  }
}
