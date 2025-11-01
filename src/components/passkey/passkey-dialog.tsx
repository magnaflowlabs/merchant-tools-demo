import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconShield, IconShieldCheck, IconLoader2 } from '@tabler/icons-react';
import { PasskeyService } from '@/services/PasskeyService';
import {
  usePasskeyState,
  usePasskeyAutoDetect,
  usePasskeyRegister,
  usePasskeyDialogContent,
} from './hooks';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { useWebSocketService } from '@/services/ws';
import { useShallow } from '@/stores';
import { useChainConfigLoader } from '@/hooks/use-chain-config-loader';

import { useAtom } from 'jotai';
import { wsStoreAtom } from '@/stores/ws-store';
const iconMap = {
  IconShield,
  IconShieldCheck,
  IconLoader2,
};

export function PasskeyDialog() {
  const navigate = useNavigate();
  const { ws } = useWebSocketService();
  const { state, updateState, resetState } = usePasskeyState('auto_detect');
  const { detectPasskeyStatus } = usePasskeyAutoDetect();
  const { registerPasskey } = usePasskeyRegister();
  const { addNotification } = useAppStore();
  const [wsConfig, setWsConfig] = useAtom(wsStoreAtom);
  const { loadChainConfigs } = useChainConfigLoader();

  const merchantId = wsConfig.user?.merchant_id;
  useEffect(() => {
    if (!merchantId) {
      navigate('/login', { replace: true });
    }
  }, [merchantId, navigate]);

  const navigateToDashboard = useCallback(async () => {
    await loadChainConfigs();

    // Navigate to dashboard after chain configs fetch (success or failure)
    navigate('/dashboard');
    toast.success('Login Success', { duration: 1500 });
  }, [navigate, loadChainConfigs]);

  const onError = useCallback(
    (errorMessage: string) => {
      toast.error(errorMessage, { duration: 1500 });
    },
    [state.currentMode, addNotification]
  );

  const handleAutoDetect = useCallback(async () => {
    updateState({ isDetecting: true });
    const result = await detectPasskeyStatus();
    if (result.success && result.mode && result.data) {
      updateState({
        currentMode: result.mode,
        passkeyData: result.data,
        isDetecting: false,
      });
    } else {
      updateState({ isDetecting: false });
      onError(result.error || 'Failed to detect passkey status');
    }
  }, [detectPasskeyStatus, updateState, onError]);

  const handleRegister = useCallback(async () => {
    if (!state.passkeyData) return;
    updateState({ isProcessing: true });

    const result = await registerPasskey(state.passkeyData);
    if (result.success) {
      navigateToDashboard();
    } else {
      updateState({ isProcessing: false });
      onError(result.error || 'Registration failed');
    }
  }, [state.passkeyData, registerPasskey, updateState, onError]);

  const handleVerify = useCallback(async () => {
    if (!state.passkeyData) return;

    updateState({ isProcessing: true });
    const result = await PasskeyService.verifyPasskey(state.passkeyData);
    if (result.success) {
      setWsConfig({
        ...wsConfig,
        token: result.data.token,
        user: {
          ...result.data.user_info,
          merchant_id: wsConfig.user?.merchant_id,
        },
      });
      navigateToDashboard();
    } else {
      updateState({ isProcessing: false });
      onError(result.error || 'Verification failed');
    }
  }, [state.passkeyData, state.currentMode, updateState, navigateToDashboard, onError]);

  const handleCancel = useCallback(() => {
    if (ws.isConnected()) {
      ws.disconnect();
      setWsConfig({
        ...wsConfig,
        token: '',
        user: {
          ...wsConfig.user,
          merchant_id: '',
        },
      });
    }
    onError('User cancelled Passkey verification');
    navigate('/login');
  }, [addNotification, navigate]);

  const { getDialogContent } = usePasskeyDialogContent(
    state.currentMode,
    state.isDetecting,
    handleRegister,
    handleVerify
  );

  useEffect(() => {
    if (state.currentMode === 'auto_detect') {
      handleAutoDetect();
    }
  }, [updateState, resetState, handleAutoDetect]);

  const dialogContent = getDialogContent();
  const IconComponent = iconMap[dialogContent.icon as keyof typeof iconMap];

  return (
    <Dialog
      open={true}
      onOpenChange={(open) =>
        !open && state.currentMode !== 'verify_after_register' && handleCancel()
      }
      modal
    >
      <DialogContent
        className="sm:max-w-[425px]"
        onEscapeKeyDown={() => state.currentMode !== 'verify_after_register' && handleCancel()}
        onPointerDownOutside={() => state.currentMode !== 'verify_after_register' && handleCancel()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRegister}>
              <IconComponent className="h-5 w-5 text-primary" />
            </Button>
            {dialogContent.title}
          </DialogTitle>
          <DialogDescription>{dialogContent.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <IconShield className="h-4 w-4" />
                Merchant Information
              </h4>
              <p className="text-sm text-muted-foreground">
                Merchant ID:
                <span className="font-mono text-blue-600 dark:text-blue-400">{merchantId}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Username:
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {wsConfig.user?.username}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Role:
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {wsConfig.user?.role}
                </span>
              </p>
            </div>

            {state.currentMode === 'register' && (
              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  🔒 We recommend registering a Passkey to improve account security. Passkey uses
                  your device for identity verification, no need to remember additional passwords.
                  If you choose to cancel, you will be logged out.
                </p>
              </div>
            )}

            {state.currentMode === 'verify_after_register' && (
              <div className="bg-green-50 dark:bg-green-950/50 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ Passkey registration successful! To ensure the credential works properly,
                  please click the button below to verify. This is the final step of the security
                  process.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {dialogContent.showCancel && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={state.isProcessing || state.isDetecting}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={dialogContent.buttonAction}
            disabled={state.isProcessing || state.isDetecting || dialogContent.isDetecting}
            className="flex items-center gap-2 flex-1"
          >
            {state.isProcessing || state.isDetecting ? (
              <>
                <IconLoader2 className="h-4 w-4 animate-spin" />
                {state.isDetecting ? 'Detecting...' : 'Processing...'}
              </>
            ) : (
              dialogContent.buttonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
