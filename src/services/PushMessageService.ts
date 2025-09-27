/**
 * Push Message Service
 * Handles WebSocket push message business logic
 */

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
import { wsService } from '@/services/ws';
import type { PayinOrder } from '@/types/merchant';
import { PayinOrderStatus } from '@/types/merchant';

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
   * Handle collection orders push
   */
  static handleCollectionOrders(message: CollectionOrdersPushMessage): void {
    const { chain, total_records, list } = message.data;

    if (list && list.length > 0) {
      const payinOrders: PayinOrder[] = list.map((item: PayinOrder) => ({
        ...item,
        chain: chain,
        status: PayinOrderStatus.Pending,
      }));

      DefaultPushMessageHandlers.handlePayinOrders(payinOrders);
    }

    list.forEach((order, index) => {
      // Process order data if needed
    });

    // Can trigger:
    // 1. Update global state
    // 2. Show notifications
    // 3. Refresh related components
    // 4. Trigger other business logic
  }

  /**
   * Handle collection order data (migrated from MerchantWebSocketService)
   */
  static handlePayinOrders(collectionDatas: PayinOrder | PayinOrder[]): void {
    if (!collectionDatas) return;

    const orderStore = useOrderStore.getState();
    const payinOrderStatusStore = usePayinOrderStatusStore.getState();

    const validOrders: PayinOrder[] = [collectionDatas]
      .flat()
      .filter((order: PayinOrder) => Boolean(order) && typeof order === 'object');
    if (validOrders.length > 0) {
      const orderKey = `${validOrders[0].address}${validOrders[0].created_at}${validOrders[0].usdt}`;

      orderStore.addPayinOrders(validOrders);
      payinOrderStatusStore.setOrdersStatus(validOrders, PayinOrderStatus.Pending);
    }
  }

  /**
   * Handle payout orders push
   */
  static handlePayoutOrders(message: PayoutOrdersPushMessage): void {
    const orderStore = useOrderStore.getState();
    const { list } = message.data;
    list && orderStore.addPayoutOrders(list);
  }

  /**
   * Handle lock status push
   */
  static handleLocks(message: LocksPushMessage): void {
    const { total_records, list } = message.data;

    list.forEach((lock, index) => {
      // Process lock data if needed
    });

    // Can trigger:
    // 1. Update lock status display
    // 2. Show lock status change notifications
    // 3. Refresh related UI components
  }

  /**
   * Handle address usage push
   */
  static handleAddressUsage(message: AddressUsagePushMessage): void {
    const merchantStore = useMerchantStore.getState();
    const syncConfigStore = useSyncConfigStore.getState();
    const { chain, list } = message.data;
    const authStore = useAuthStore.getState();
    if (list.length > 0) {
      if (syncConfigStore.isExecutingSync) {
        return;
      }
      if (chain === authStore.cur_chain.chain) {
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
