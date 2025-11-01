import { generateUniqueId, WebSocketCore } from './core';
import { MessageManager, TasksService } from './core';
import type { BaseMessage, MessageResult, PendingMessages, WebSocketOptions } from './core';
import {
  WEBSOCKET_EVENTS,
  TASK_CONFIG,
  ERROR_MESSAGES,
  MESSAGE_CONFIG,
  HEARTBEAT_CONFIG,
} from './config';
import { PushMessageService, DefaultPushMessageHandlers } from '@/services/PushMessageService';

export class WebSocketService {
  private wsCore: WebSocketCore;
  private wsUrl: string | null = null;
  private messageManager: MessageManager;
  private tasksService: TasksService;
  private pushMessageService: PushMessageService;

  private lastMessageReceiveTime: number = 0;
  private lastMessageSendTime: number = 0;

  // Reconnection related
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private baseDelay: number;
  private maxDelay: number;
  private lastReconnectTime = 0;

  constructor(options?: WebSocketOptions) {
    this.wsCore = new WebSocketCore();
    this.messageManager = new MessageManager();
    this.tasksService = new TasksService({
      interval: TASK_CONFIG.BASE_INTERVAL,
      autoStart: false,
    });
    this.pushMessageService = new PushMessageService();

    // Ws options
    this.maxReconnectAttempts = options?.reconnect?.maxAttempts || 5;
    this.baseDelay = options?.reconnect?.baseDelay || 1000;
    this.maxDelay = options?.reconnect?.maxDelay || 30000;

    this.setupWebSocket();
    this.setupTasks();
    this.setupPushMessageHandlers();

    // Don't start tasks service immediately - only start when connected
    // this.tasksService.start();
  }

  // ==================== Init Tasks Setup ====================
  private setupWebSocket(): void {
    this.wsCore.on(WEBSOCKET_EVENTS.CONNECT, () => {
      this.reconnectAttempts = 0;
      this.lastMessageReceiveTime = 0;
      this.lastMessageSendTime = 0;
    });

    this.wsCore.on(WEBSOCKET_EVENTS.DISCONNECT, (event) => {});

    this.wsCore.on(WEBSOCKET_EVENTS.MESSAGE, (event) => {
      this.lastMessageReceiveTime = Date.now();
      const data = event.detail;
      this.messageManager.receiveMessage(data);
    });

    this.messageManager.on(WEBSOCKET_EVENTS.PUSH_MESSAGE, (event) => {
      this.pushMessageService.handlePushMessage(event.detail);
    });

    // Initial binding for first connection
    this.messageManager.on(WEBSOCKET_EVENTS.MESSAGE_ENQUEUED, (event: CustomEvent) => {
      const message = event.detail;
      this.lastMessageSendTime = Date.now();
      this.wsCore.send(message);
    });
  }
  private setupTasks(): void {
    this.tasksService.addHandlers([
      {
        name: 'heartbeat',
        handler: (now: number) => {
          if (!this.isConnected()) return;
          this.checkHeartbeatTimeout(now);
          if (now - this.lastMessageSendTime > TASK_CONFIG.HEARTBEAT_SEND_TIMEOUT) {
            this.sendPing();
          }
        },
        interval: TASK_CONFIG.HEARTBEAT_INTERVAL,
      },
      {
        name: 'connection-status-check',
        handler: (now: number) => {
          if (!this.wsUrl || this.isConnected()) return;

          this.handleReconnection(now);

          if (this.reconnectAttempts > 3) {
            console.warn('⚠️ High reconnect attempts:', this.reconnectAttempts);
          }
        },
        interval: TASK_CONFIG.STATUS_CHECK_INTERVAL,
      },
      {
        name: 'queue-status-check',
        handler: (now: number) => {
          const status = this.messageManager.getPendingMessages();
          if (status.size > 50) {
            console.warn('⚠️ Too many pending messages:', status.size);
          }

          this.checkPendingMessageTimeouts(now);
        },
        interval: TASK_CONFIG.QUEUE_CHECK_INTERVAL,
      },
    ]);
  }

  // ==================== Push Message Setup ====================
  private setupPushMessageHandlers(): void {
    this.pushMessageService.registerHandler(
      'kit_collection_orders',
      DefaultPushMessageHandlers.handleCollectionOrders
    );
    this.pushMessageService.registerHandler(
      'kit_payout_orders',
      DefaultPushMessageHandlers.handlePayoutOrders
    );
    this.pushMessageService.registerHandler('kit_locks', DefaultPushMessageHandlers.handleLocks);
    this.pushMessageService.registerHandler(
      'kit_address_usage',
      DefaultPushMessageHandlers.handleAddressUsage
    );
    this.pushMessageService.registerHandler(
      'auth_terminated',
      DefaultPushMessageHandlers.handleAuthTerminated
    );

    this.pushMessageService.on('push_message_handled', (event) => {});

    this.pushMessageService.on('push_message_error', (event) => {
      console.error('Push message handling failed:', event.detail);
    });

    this.pushMessageService.on('push_message_unhandled', (event) => {
      console.warn('Unhandled push message:', event.detail);
    });
  }

  // ==================== Connection Management ====================

  connect(url: string): void {
    if (!url) {
      throw new Error('WSS URL is required');
    }

    if (this.wsCore && this.isConnected()) {
      throw new Error('WebSocket already connected');
    }

    this.wsUrl = url;
    this.wsCore.connect(this.wsUrl);

    // Start tasks service when connecting
    if (!this.tasksService.isRunning()) {
      this.tasksService.start();
    }
  }

  connectAsync(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('WSS URL is required'));
        return;
      }

      if (this.wsCore && this.isConnected()) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      const onConnect = () => {
        clearTimeout(timeout);
        this.wsCore.off(WEBSOCKET_EVENTS.CONNECT, onConnect);
        this.wsCore.off(WEBSOCKET_EVENTS.ERROR, onError);
        resolve();
      };

      const onError = (event: any) => {
        clearTimeout(timeout);
        this.wsCore.off(WEBSOCKET_EVENTS.CONNECT, onConnect);
        this.wsCore.off(WEBSOCKET_EVENTS.ERROR, onError);
        reject(new Error('WebSocket connection failed'));
      };

      this.wsCore.on(WEBSOCKET_EVENTS.CONNECT, onConnect);
      this.wsCore.on(WEBSOCKET_EVENTS.ERROR, onError);

      this.wsUrl = url;
      this.wsCore.connect(this.wsUrl);

      // Start tasks service when connecting
      if (!this.tasksService.isRunning()) {
        this.tasksService.start();
      }
    });
  }

  disconnect(): void {
    this.wsCore.disconnect();
    // Stop tasks service to prevent ping and reconnection attempts
    this.tasksService.stop();
    // Clear all pending messages when disconnecting
    this.messageManager.clearPendingMessages();
    // Reset reconnection attempts and clear URL to prevent reconnection
    this.reconnectAttempts = 0;
    this.lastReconnectTime = 0;
    this.wsUrl = null;
  }

  isConnected(): boolean {
    return this.wsCore.getConnectionInfo().isConnected || false;
  }

  // Send ping message and wait for response
  async sendPing(): Promise<void> {
    if (!this.isConnected()) {
      console.warn('⚠️ WebSocket not connected, cannot send ping');
      return;
    }

    try {
      await this.sendRequest(HEARTBEAT_CONFIG.PING_TYPE);
    } catch (error) {
      console.warn('❌ Heartbeat failed:', error);
      // Don't throw error here, let timeout check handle it
    }
  }

  // Check heartbeat timeout
  private checkHeartbeatTimeout(now: number) {
    if (this.lastMessageReceiveTime === 0) {
      return;
    }

    const timeSinceLastHbReceive = now - this.lastMessageReceiveTime;

    // Timeout threshold: 3 times the heartbeat interval (15 seconds)
    const timeoutThreshold =
      TASK_CONFIG.HEARTBEAT_SEND_TIMEOUT * TASK_CONFIG.HEARTBEAT_TIMEOUT_FACTOR;

    if (timeSinceLastHbReceive > timeoutThreshold) {
      console.error('💔 Heartbeat timeout detected!', {
        timeSinceLastHbReceive,
        timeoutThreshold,
      });
      this.wsCore.disconnect();
    }
  }

  // ==================== Message Sending ====================

  async sendRequest<T>(method: string, params?: Record<string, any>): Promise<MessageResult<T>> {
    if (!this.isConnected()) {
      throw new Error(ERROR_MESSAGES.CONNECTION.NOT_CONNECTED);
    }
    const message: BaseMessage = {
      method,
      nonce: generateUniqueId(),
      params,
    };

    try {
      return await this.messageManager.sendMessage(message, message.nonce);
    } catch (error) {
      this.messageManager.emit(WEBSOCKET_EVENTS.MESSAGE_ERROR, error);
      throw error;
    }
  }

  // ==================== Message Receiving ====================

  onMessage(callback: (message: any) => void): void {
    this.messageManager.on(WEBSOCKET_EVENTS.MESSAGE_RECEIVED, (event) => {
      callback(event.detail);
    });
  }

  // Listen for server push messages (legacy method for backward compatibility)
  onPushMessage(callback: (message: any) => void): void {
    this.messageManager.on(WEBSOCKET_EVENTS.PUSH_MESSAGE, (event) => {
      callback(event.detail);
    });
  }

  // Remove push message listener (legacy method for backward compatibility)
  offPushMessage(callback: (message: any) => void): void {
    this.messageManager.off(WEBSOCKET_EVENTS.PUSH_MESSAGE, callback);
  }

  // ==================== Push Message Management ====================

  /**
   * Register push message handler
   */
  registerPushHandler<T extends any>(method: string, handler: (message: T) => void): void {
    this.pushMessageService.registerHandler(method as any, handler as any);
  }

  /**
   * Unregister push message handler
   */
  unregisterPushHandler(method: string): void {
    this.pushMessageService.unregisterHandler(method);
  }

  /**
   * Get registered push message handlers
   */
  getRegisteredPushHandlers(): string[] {
    return this.pushMessageService.getRegisteredHandlers();
  }

  /**
   * Clear all push message handlers
   */
  clearPushHandlers(): void {
    this.pushMessageService.clearHandlers();
  }

  // ==================== Event Listening ====================

  on(event: string, callback: (event: CustomEvent) => void): void {
    this.wsCore.on(event, callback);
    this.messageManager.on(event, callback);
  }

  off(event: string, callback: (event: CustomEvent) => void): void {
    this.wsCore.off(event, callback);
    this.messageManager.off(event, callback);
  }

  // ==================== Reconnection Management ====================

  private handleReconnection(now: number): void {
    if (!navigator.onLine) {
      console.error('network is offline, skipping reconnection');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      // Emit event to notify that max reconnection attempts reached
      this.wsCore.emit('max_reconnect_reached', {
        detail: {
          reconnectAttempts: this.reconnectAttempts,
          maxReconnectAttempts: this.maxReconnectAttempts,
        },
      });
      // Disconnect WebSocket and stop reconnection attempts
      this.disconnect();
      return;
    }

    if (this.isConnected()) {
      return;
    }

    // Calculate delay for this reconnection attempt
    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxDelay);

    // Check if enough time has passed since last reconnection attempt
    if (now - this.lastReconnectTime < delay) {
      return; // Wait for the delay period
    }

    this.reconnectAttempts++;
    this.lastReconnectTime = now;

    // Attempt reconnection immediately (delay is handled by task interval)
    try {
      this.connect(this.wsUrl || '');
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
    }
  }

  // ==================== Message Timeout Management ====================

  private checkPendingMessageTimeouts(now: number): void {
    const pendingMessages = this.messageManager.getPendingMessages();
    const timeoutThreshold = MESSAGE_CONFIG.DEFAULT_TIMEOUT;

    for (const [messageId, pending] of pendingMessages) {
      if (now - pending.timestamp > timeoutThreshold) {
        console.warn(`⚠️ Message timeout: ${messageId} (${now - pending.timestamp}ms)`);
        this.messageManager.rejectPendingMessage(
          messageId,
          new Error(ERROR_MESSAGES.MESSAGE.TIMEOUT)
        );
      }
    }
  }

  // ==================== Connection Information ====================

  getConnectionInfo(): {
    isConnected: boolean;
    connectionStatus: any;
    pendingMessages: PendingMessages;
    url: string | null;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  } {
    const { isConnected, readyState } = this.wsCore.getConnectionInfo();
    return {
      url: this.wsUrl,
      isConnected: isConnected,
      connectionStatus: readyState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      pendingMessages: this.messageManager.getPendingMessages(),
    };
  }
}
