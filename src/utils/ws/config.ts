// WebSocket Configuration Constants

// ==================== Event Names ====================
export const WEBSOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Message events
  MESSAGE: 'message',

  // Message manager events
  STARTED: 'started',
  STOPPED: 'stopped',
  MESSAGE_ENQUEUED: 'message_enqueued',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_ERROR: 'message_error',
  QUEUE_CLEARED: 'queue_cleared',
  PUSH_MESSAGE: 'push_message',
} as const;

// ==================== Heartbeat Configuration ====================
export const HEARTBEAT_CONFIG = {
  // Heartbeat message types
  PING_TYPE: 'ping',
} as const;

// ==================== Reconnection Configuration ====================
export const RECONNECTION_CONFIG = {
  // Default reconnection settings
  DEFAULT_MAX_ATTEMPTS: 10, // Maximum number of reconnection attempts
  DEFAULT_BASE_DELAY: 1000, // Base delay in milliseconds for exponential backoff
  DEFAULT_MAX_DELAY: 30000, // Maximum delay in milliseconds for exponential backoff

  // Reconnection close codes - WebSocket close codes that determine reconnection behavior
  NORMAL_CLOSE: 1000, // Normal closure - connection closed cleanly
  GOING_AWAY: 1001, // Server is shutting down or client is navigating away
  PROTOCOL_ERROR: 1002, // Protocol error occurred
  UNSUPPORTED_DATA: 1003, // Unsupported data type received
  NO_STATUS_RECEIVED: 1005, // No status code received (abnormal closure)
  ABNORMAL_CLOSURE: 1006, // Connection closed abnormally (e.g., network error)
  INVALID_FRAME_PAYLOAD_DATA: 1007, // Invalid frame payload data received
  POLICY_VIOLATION: 1008, // Policy violation occurred
  MESSAGE_TOO_BIG: 1009, // Message too big to process
  INTERNAL_ERROR: 1011, // Internal server error
  SERVICE_RESTART: 1012, // Server is restarting
  TRY_AGAIN_LATER: 1013, // Server is overloaded, try again later
  BAD_GATEWAY: 1014, // Bad gateway error
  TLS_HANDSHAKE: 1015, // TLS handshake failure
} as const;

// ==================== Message Configuration ====================
export const MESSAGE_CONFIG = {
  // Message timeout (30 seconds)
  DEFAULT_TIMEOUT: 30000,

  // Message ID prefix
  ID_PREFIX: {
    MESSAGE: 'msg',
    NONCE: 'nonce',
  },
} as const;

// ==================== Task Configuration ====================
export const TASK_CONFIG = {
  // Base check interval (200ms)
  BASE_INTERVAL: 200,
  HEARTBEAT_INTERVAL: 5_000, // 5 seconds
  HEARTBEAT_TIMEOUT_FACTOR: 3, // 3 times of heartbeat interval
  QUEUE_CHECK_INTERVAL: 3_000,
  STATUS_CHECK_INTERVAL: 3_000,
} as const;

// ==================== Error Messages ====================
export const ERROR_MESSAGES = {
  CONNECTION: {
    NOT_INITIALIZED: 'WebSocket service not initialized',
    NOT_CONNECTED: 'WebSocket not connected',
    ALREADY_CONNECTING: 'WebSocket is already connecting',
    ALREADY_CONNECTED: 'WebSocket is already connected',
    CONNECTION_FAILED: 'Connection failed',
    DISCONNECT_FAILED: 'Disconnect failed',
  },

  MESSAGE: {
    MANAGER_NOT_ACTIVE: 'Message manager is not active',
    SEND_FAILED: 'Failed to send message',
    PARSE_FAILED: 'Failed to parse message',
    TIMEOUT: 'Message timeout',
    REQUEST_FAILED: 'Request failed',
  },

  HEARTBEAT: {
    TIMEOUT: 'Heartbeat timeout',
    PING_FAILED: 'Failed to send ping',
    PONG_FAILED: 'Failed to receive pong',
  },

  RECONNECTION: {
    MAX_ATTEMPTS_REACHED: 'Max reconnection attempts reached',
    RECONNECT_FAILED: 'Reconnection failed',
  },
} as const;

// ==================== Log Messages ====================
export const LOG_MESSAGES = {
  CONNECTION: {
    CONNECTING: 'WebSocket connecting...',
    CONNECTED: 'WebSocket connected',
    DISCONNECTING: 'WebSocket disconnecting...',
    DISCONNECTED: 'WebSocket disconnected',
    RECONNECTING: 'Reconnecting...',
    RECONNECT_ATTEMPT: 'Reconnection attempt',
  },

  MESSAGE: {
    SENT: 'Message sent',
    RECEIVED: 'Message received',
    PARSED: 'Message parsed',
    ENQUEUED: 'Message enqueued',
    DEQUEUED: 'Message dequeued',
  },

  HEARTBEAT: {
    PING_SENT: 'Ping sent',
    TIMEOUT: 'Heartbeat timeout',
  },

  TASK: {
    STARTED: 'Task started',
    STOPPED: 'Task stopped',
    EXECUTED: 'Task executed',
    FAILED: 'Task failed',
  },
} as const;

// ==================== Type Definitions ====================
export type WebSocketEventType = (typeof WEBSOCKET_EVENTS)[keyof typeof WEBSOCKET_EVENTS];
export type HeartbeatMessageType = typeof HEARTBEAT_CONFIG.PING_TYPE;
