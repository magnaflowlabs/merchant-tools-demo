import type { BaseMessage, MessageResult, PendingMessages } from './types';
import { WEBSOCKET_EVENTS, ERROR_MESSAGES } from '../config';
import { EventEmitter } from './event';
import { generateUniqueId } from './utils';

export class MessageManager extends EventEmitter {
  private pendingMessages: PendingMessages = new Map();

  constructor() {
    super();
  }

  // ==================== Message Sending ====================

  async sendMessage(message: BaseMessage, id?: string): Promise<MessageResult> {
    let messageId = id;
    const enrichedMessage = { ...message } as any;

    if (!messageId) {
      messageId = generateUniqueId('msg');
      enrichedMessage.id = messageId;
    }

    // Emit message enqueued event to trigger sending
    this.emit(WEBSOCKET_EVENTS.MESSAGE_ENQUEUED, enrichedMessage);

    // Wait for response using nonce
    return await this.waitForResponse(messageId);
  }

  // ==================== Message Receiving ====================

  receiveMessage(rawData: any): void {
    try {
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      // Check if this is a push message (new format: has type: "push" and method field)
      if (data.type === 'push' && data.method && data.nonce) {
        // This is a server push message in new format
        this.emit(WEBSOCKET_EVENTS.PUSH_MESSAGE, data);
        return;
      }

      // Check if this is a push message (old format: has type field but no nonce)
      if (data.type && !data.nonce) {
        // This is a server push message in old format
        this.emit(WEBSOCKET_EVENTS.PUSH_MESSAGE, data);
        return;
      }

      // Check if there's a corresponding pending message (response to request)
      if (data.nonce) {
        this.resolvePendingMessage(data.nonce, data);
      }

      // Emit regular message event
      this.emit(WEBSOCKET_EVENTS.MESSAGE_RECEIVED, data);
    } catch (error) {
      console.error(ERROR_MESSAGES.MESSAGE.PARSE_FAILED, error);
    }
  }

  // ==================== Queue Status ====================

  getPendingMessages(): PendingMessages {
    return this.pendingMessages;
  }

  // ==================== Pending Message Management ====================

  private async waitForResponse(messageId: string): Promise<MessageResult> {
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(messageId, {
        resolve,
        reject,
        timestamp: Date.now(),
      });
    });
  }

  private resolvePendingMessage(nonce: string, data: any): void {
    const pending = this.pendingMessages.get(nonce);
    if (pending) {
      this.pendingMessages.delete(nonce);
      if (data.code === 200) {
        // Return success result with data
        pending.resolve({
          code: data.code,
          success: true,
          data: data.data || data,
          error: undefined,
        });
        return;
      }

      pending.reject({
        code: data.code,
        success: false,
        data: data.data || data || undefined,
        error: data.message || ERROR_MESSAGES.MESSAGE.REQUEST_FAILED,
      });
    }
  }
  // Reject a pending message (for timeout handling)
  rejectPendingMessage(messageId: string, error: Error): void {
    const pending = this.pendingMessages.get(messageId);
    if (pending) {
      this.pendingMessages.delete(messageId);
      pending.reject(error);
    }
  }

  clearPendingMessages(): void {
    this.pendingMessages.forEach((pending) => {
      pending.reject(new Error(ERROR_MESSAGES.CONNECTION.DISCONNECT_FAILED));
    });
    this.pendingMessages.clear();
  }
}
