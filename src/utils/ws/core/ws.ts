import { ConnectionStatus } from './types';
import { WEBSOCKET_EVENTS } from '../config';
import { EventEmitter } from './event';

export class WebSocketCore extends EventEmitter {
  private ws: WebSocket | null = null;
  private readyState: ConnectionStatus = ConnectionStatus.CLOSED;

  constructor() {
    super();
  }

  // ==================== Connection Management ====================

  connect(url: string): void {
    if (
      this.readyState === ConnectionStatus.OPEN ||
      this.readyState === ConnectionStatus.CONNECTING
    ) {
      return;
    }

    try {
      this.readyState = ConnectionStatus.CONNECTING;
      this.ws = new WebSocket(url);

      // Wait for connection to be established
      this.ws.onopen = () => {
        this.readyState = ConnectionStatus.OPEN;
        this.emit(WEBSOCKET_EVENTS.CONNECT);
      };

      this.ws.onerror = (error) => {
        this.readyState = ConnectionStatus.CLOSED;
        this.emit(WEBSOCKET_EVENTS.ERROR, error);
      };

      this.ws.onclose = (event) => {
        this.readyState = ConnectionStatus.CLOSED;
        this.emit(WEBSOCKET_EVENTS.DISCONNECT, {
          code: event.code,
          reason: event.reason,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(WEBSOCKET_EVENTS.MESSAGE, data);
        } catch (error) {
          this.emit(WEBSOCKET_EVENTS.ERROR, error);
        }
      };
    } catch (error) {
      this.readyState = ConnectionStatus.CLOSED;
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.readyState = ConnectionStatus.CLOSING;
      this.ws.close();
    }

    this.readyState = ConnectionStatus.CLOSED;
  }

  // ==================== Event Handling ====================
  // Event handlers are now set directly in the connect() method

  // ==================== Message Sending ====================

  send(data: string | object): void {
    if (this.readyState === ConnectionStatus.OPEN && this.ws) {
      const message = typeof data === 'object' ? JSON.stringify(data) : data;
      this.ws.send(message);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message:', data);
    }
  }

  // ==================== Status Queries ====================

  getConnectionInfo(): {
    isConnected: boolean;
    readyState: ConnectionStatus;
    ws: WebSocket | null;
  } {
    return {
      readyState: this.readyState,
      isConnected: this.readyState === ConnectionStatus.OPEN,
      ws: this.ws,
    };
  }
}
