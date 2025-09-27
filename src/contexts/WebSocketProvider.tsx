import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { wsStoreAtom } from '@/stores/ws-store';
import { useChainConfigStore, useAppStore } from '@/stores';
import {
  NextAction,
  useAuthBindMutation,
  useWebSocketService,
  adminGetChainConfigs,
} from '@/services/ws';
import { useAuthStore } from '@/stores/auth-store';

interface WebSocketContextType {
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  ws: any;
  connect: (url: string) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [wsConfig, setWsConfig] = useAtom(wsStoreAtom);
  const { ws, connectAsync, connect } = useWebSocketService();
  const { mutateAsync: authBind } = useAuthBindMutation();
  const navigate = useNavigate();
  const { setChainConfigs, setLoading, setError } = useChainConfigStore();
  const { setCurChain } = useAppStore();
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');
  const { user, setUser, setIsAdmin, logout } = useAuthStore();

  // Listen for connection events to update state
  useEffect(() => {
    if (!ws) return;

    const onConnectWatch = (ev: CustomEvent) => {
      setConnectionStatus('connected');

      if (wsConfig.token) {
        authBind({ token: wsConfig.token })
          .then(async (bindResult) => {
            if (bindResult?.token) {
              const { token, user_info } = bindResult;

              setWsConfig({
                ...wsConfig,
                token,
                user: { ...user_info },
              });
              setUser(user_info);
              setIsAdmin(user_info.role === 'admin');
            } else {
            }
            try {
              setLoading(true);
              setError(null);
              const result = await adminGetChainConfigs();
              if (result.success && result.data) {
                setChainConfigs(result.data.chain_configs);
                if (result.data.chain_configs.length > 0) {
                  setCurChain(result.data.chain_configs[0].chain);
                }
              } else {
                setError(result.error || 'Failed to load chain configurations');
              }
              setLoading(false);

              // Navigate to dashboard after chain configs fetch (success or failure)
              navigate('/dashboard');
            } catch (error) {
              console.error('Failed to get chain configs:', error);
              setError('Failed to load chain configurations');
              setLoading(false);
              navigate('/dashboard');
            }
          })
          .catch((error) => {
            console.error('Auth bind failed:', error);
          });
      }
    };

    const onDisconnectWatch = (ev: CustomEvent) => {
      setConnectionStatus('disconnected');
    };

    const onErrorWatch = (ev: CustomEvent) => {
      setConnectionStatus('disconnected');
    };

    const onMaxReconnectReachedWatch = (ev: CustomEvent) => {
      console.error('Max reconnection attempts reached, logging out user');
      setConnectionStatus('disconnected');
      // Clear auth state and redirect to login
      logout();
      setWsConfig({ ...wsConfig, token: '' });
      navigate('/login');
    };

    const onMessageErrorWatch = (ev: CustomEvent) => {
      const res = ev.detail;
      if (res.code === 401) {
        const nextAction = res?.data?.next_action;
        if (nextAction === NextAction.PASSWORD_REQUIRED) {
          console.warn('Password required');
          navigate('/login');
          return;
        }

        if (nextAction === NextAction.PASSKEY_REQUIRED) {
          console.warn('Passkey required');
          navigate('/passkey');
          return;
        }

        console.warn('Authentication required');
        setWsConfig({ ...wsConfig, token: '' });
        ws.disconnect();
      }
    };

    const onPushMessageWatch = (message: any) => {
      if (message.type && !message.method) {
        switch (message.type) {
          case 'kit_collection_orders':
            break;
          case 'kit_payout_orders':
            break;
          case 'kit_address_usage':
            break;
          default:
            break;
        }
      } else if (message.type === 'push' && message.method) {
      }
    };

    ws.on('connect', onConnectWatch);
    ws.on('disconnect', onDisconnectWatch);
    ws.on('error', onErrorWatch);
    ws.on('max_reconnect_reached', onMaxReconnectReachedWatch);
    ws.on('message_error', onMessageErrorWatch);
    ws.onPushMessage(onPushMessageWatch);

    return () => {
      ws.off('connect', onConnectWatch);
      ws.off('disconnect', onDisconnectWatch);
      ws.off('error', onErrorWatch);
      ws.off('max_reconnect_reached', onMaxReconnectReachedWatch);
      ws.off('message_error', onMessageErrorWatch);
      ws.offPushMessage(onPushMessageWatch);
    };
  }, [
    ws,
    wsConfig.token,
    authBind,
    navigate,
    setChainConfigs,
    setLoading,
    setError,
    setCurChain,
    logout,
    setWsConfig,
  ]);

  useEffect(() => {
    const connectWebSocket = async () => {
      if (!wsConfig.wsUrl || ws.isConnected()) return;

      setConnectionStatus('connecting');
      try {
        await connectAsync(wsConfig.wsUrl);
      } catch (error: any) {
        console.error('Failed to connect:', error);
        setConnectionStatus('disconnected');
      }
    };
    connectWebSocket();
  }, [wsConfig.wsUrl, ws]);

  return (
    <WebSocketContext.Provider
      value={{
        connectionStatus,
        ws,
        connect,
        disconnect: () => ws?.disconnect(),
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
