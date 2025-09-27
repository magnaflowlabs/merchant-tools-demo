import { useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { useWebSocketService } from '@/services/ws';

interface MerchantServiceProviderProps {
  children: React.ReactNode;
}

export function MerchantServiceProvider({ children }: MerchantServiceProviderProps) {
  const { isAuthenticated, connUrl } = useAuthStore();
  const { ws, connectAsync } = useWebSocketService();

  useEffect(() => {
    if (isAuthenticated && connUrl && !ws.isConnected()) {
      connectAsync(connUrl).catch(console.error);
    }
  }, [isAuthenticated, connUrl, ws, connectAsync]);

  return <>{children}</>;
}
