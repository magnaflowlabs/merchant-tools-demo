import { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import Dashboard from '@/app/dashboard/page';
import { NotificationContainer } from '@/components/ui/notification-container';
import { MerchantServiceProvider } from '@/components/merchant-service-provider';
import { WebSocketProvider } from '@/contexts/WebSocketProvider';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PasskeyDialog } from '@/components/passkey';
import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletModalProvider } from '@tronweb3/tronwallet-adapter-react-ui';
import '@/styles/tronwallet-adapter.css';

import { Toaster } from 'sonner';
import {
  TronLinkAdapter,
  OkxWalletAdapter,
  TokenPocketAdapter,
  BitKeepAdapter,
} from '@tronweb3/tronwallet-adapters';
import {
  detectTronLink,
  detectOkxWallet,
  detectTokenPocket,
  detectBitKeep,
} from '@/utils/wallet-detection';
import './App.css';

function App() {
  // Dynamically generate adapter array based on detected wallets
  const adapters: any[] = useMemo(() => {
    const availableAdapters: any[] = [];

    // Detect and add TronLink adapter
    if (detectTronLink().isInstalled) {
      availableAdapters.push(new TronLinkAdapter());
    }

    // Detect and add OKX wallet adapter
    if (detectOkxWallet().isInstalled) {
      availableAdapters.push(new OkxWalletAdapter());
    }

    // Detect and add TokenPocket adapter
    if (detectTokenPocket().isInstalled) {
      availableAdapters.push(new TokenPocketAdapter());
    }

    // Detect and add BitKeep adapter
    if (detectBitKeep().isInstalled) {
      availableAdapters.push(new BitKeepAdapter());
    }

    return availableAdapters;
  }, []);
  const queryClient = useMemo(() => new QueryClient(), []);
  const basename = (() => {
    const baseHref = document.baseURI || window.location.href;
    const url = new URL(baseHref);
    const pathname = url.pathname.replace(/\/index\.html$/, '');
    const dir = pathname.endsWith('/') ? pathname : pathname.replace(/[^/]+$/, '');
    return dir.replace(/\/$/, '');
  })();

  return (
    <QueryClientProvider client={queryClient}>
      <Router basename={basename}>
        <WalletProvider adapters={adapters}>
          <WalletModalProvider>
            <WebSocketProvider>
              <MerchantServiceProvider>
                <NotificationContainer />
                <Toaster position="top-center" richColors />
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/passkey" element={<PasskeyDialog />} />

                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </MerchantServiceProvider>
            </WebSocketProvider>
          </WalletModalProvider>
        </WalletProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
