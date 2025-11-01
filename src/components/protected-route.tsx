import { Navigate } from 'react-router-dom';

import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
import { ConnectingOverlay } from '@/components/ui/connecting-overlay';
import { useWebSocketContext } from '@/contexts/WebSocketProvider';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { connectionStatus } = useWebSocketContext();
  const [wsConfig] = useAtom(wsStoreAtom);
  useEffect(() => {
    // no-op: keep effect so file preserves dependency structure if needed later
  }, []);

  const hasToken = wsConfig.token && wsConfig.token.trim() !== '';
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (connectionStatus === 'connecting') {
    return <ConnectingOverlay message="Connecting..." />;
  }
  return <>{children}</>;
}
