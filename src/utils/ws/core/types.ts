// Simplified WebSocket type definitions
export interface WebSocketOptions {
  reconnect?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
}

export interface BaseMessage {
  method: string;
  nonce: string;
  params?: Record<string, any>;
  type?: string;
}

export interface MessageResult<TData = any> {
  success: boolean;
  data?: TData;
  error?: string;
  code?: number;
}

export type PendingMessages = Map<
  string,
  {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
  }
>;

// WebSocket connection status enum
export enum ConnectionStatus {
  CONNECTING = WebSocket.CONNECTING, // 0 - Connecting
  OPEN = WebSocket.OPEN, // 1 - Connected
  CLOSING = WebSocket.CLOSING, // 2 - Closing
  CLOSED = WebSocket.CLOSED, // 3 - Closed
}
