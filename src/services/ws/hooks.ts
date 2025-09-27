import { useMutation } from '@tanstack/react-query';
import { authBind, authLogin, wsService, passkeyVerifyStart, passkeyRegister } from './api';
import type { AuthLoginArgs, AuthPasskeyRegisterArgs } from './type';
import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { useMemo } from 'react';

// Basic Hooks
// ------------------------------------------------------------
export const useWebSocketService = () => {
  const [wsConfig, setWsConfig] = useAtom(wsStoreAtom);
  const ws = useMemo(() => wsService, []);

  const connect = (url: string) => {
    ws.connect(url);
    setWsConfig({ ...wsConfig, wsUrl: url });
  };

  const connectAsync = async (url: string) => {
    await ws.connectAsync(url);
    setWsConfig({ ...wsConfig, wsUrl: url });
  };

  return {
    ws,
    connect,
    connectAsync,
    disconnect: () => ws.disconnect(),
    send: (method: string, params?: any) => ws.sendRequest(method, params),
  };
};

// Business Hooks
// ------------------------------------------------------------
export const useAuthLoginMutation = () => {
  const [wsStore, setWsStore] = useAtom(wsStoreAtom);

  return useMutation({
    mutationFn: async (arg: AuthLoginArgs) => {
      const { data } = await authLogin(arg);
      if (data?.token) {
        setWsStore({
          ...wsStore,
          token: data.token,
          user: { ...data.user_info, merchant_id: wsStore.user?.merchant_id },
        });
      }
      return data;
    },
  });
};

export const useAuthBindMutation = () => {
  const [wsStore, setWsStore] = useAtom(wsStoreAtom);

  return useMutation({
    mutationFn: async (arg: { token: string }) => {
      const { data } = await authBind(arg);
      if (data?.token) {
        setWsStore({
          ...wsStore,
          token: data.token,
          user: { ...data.user_info, merchant_id: wsStore.user?.merchant_id },
        });
      }
      return data;
    },
  });
};

export const useAuthPasskeyVerifyStartMutation = () => {
  return useMutation({
    mutationFn: passkeyVerifyStart,
  });
};

export const useAuthPasskeyRegisterMutation = () => {
  return useMutation({
    mutationFn: (arg: AuthPasskeyRegisterArgs) => passkeyRegister(arg),
  });
};
