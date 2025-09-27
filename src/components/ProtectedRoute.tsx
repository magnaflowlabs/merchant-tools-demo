import { Navigate } from 'react-router-dom';

import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { ConnectingOverlay } from '@/components/ui/connecting-overlay';
import { useWebSocketContext } from '@/contexts/WebSocketProvider';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { connectionStatus } = useWebSocketContext();
  const [wsConfig] = useAtom(wsStoreAtom);
  const [isTokenLoaded, setIsTokenLoaded] = useState(false);

  useEffect(() => {
    const checkTokenLoaded = () => {
      const storedConfig = sessionStorage.getItem('$WS_CONFIG');
      if (storedConfig) {
        try {
          const parsed = JSON.parse(storedConfig);
          setIsTokenLoaded(true);
        } catch {
          setIsTokenLoaded(true);
        }
      } else {
        setIsTokenLoaded(true);
      }
    };

    checkTokenLoaded();

    const timer = setTimeout(() => {
      setIsTokenLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isTokenLoaded) {
    return <ConnectingOverlay message="Loading..." />;
  }

  const hasToken = wsConfig.token && wsConfig.token.trim() !== '';
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (connectionStatus === 'connecting') {
    return <ConnectingOverlay message="Connecting..." />;
  }
  return <>{children}</>;
};
