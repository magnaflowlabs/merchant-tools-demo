import { useState, useCallback } from 'react';
import { PasskeyService } from '@/services/PasskeyService';
import { useAppStore } from '@/stores/app-store';
import type { PasskeyState, PasskeyMode, PasskeyActionResult } from './types';
import type { PasskeyVerifyStartData } from '@/auth/types';
import { useAuthPasskeyVerifyStartMutation } from '@/services/ws/hooks';
import { useAuthPasskeyRegisterMutation } from '@/services/ws/hooks';

export function usePasskeyState(initialMode: PasskeyMode) {
  const [state, setState] = useState<PasskeyState>({
    isProcessing: false,
    currentMode: initialMode,
    isDetecting: false,
    passkeyData: null,
  });

  const updateState = useCallback((updates: Partial<PasskeyState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isProcessing: false,
      currentMode: initialMode,
      isDetecting: false,
      passkeyData: null,
    });
  }, [initialMode]);

  return { state, updateState, resetState };
}

export function usePasskeyAutoDetect() {
  const { addNotification } = useAppStore();
  const { mutateAsync: passkeyVerifyStart } = useAuthPasskeyVerifyStartMutation();

  const detectPasskeyStatus = useCallback(async (): Promise<{
    success: boolean;
    mode?: PasskeyMode;
    data?: PasskeyVerifyStartData;
    error?: string;
  }> => {
    try {
      const startRes = await passkeyVerifyStart();

      if (startRes.code === 200) {
        const data = (startRes.data || {}) as any;
        const mode: PasskeyMode = data?.registered_ids?.length > 0 ? 'verify' : 'register';

        return {
          success: true,
          mode,
          data,
        };
      } else {
        return {
          success: false,
          error: 'Failed to detect passkey status',
        };
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to detect passkey status';
      addNotification({
        type: 'error',
        title: 'Detection Failed',
        message: errorMsg,
      });

      return {
        success: false,
        error: errorMsg,
      };
    }
  }, [addNotification, passkeyVerifyStart]);

  return { detectPasskeyStatus };
}

export function usePasskeyRegister() {
  const { addNotification } = useAppStore();
  const { mutateAsync: passkeyRegister } = useAuthPasskeyRegisterMutation();
  const registerPasskey = useCallback(
    async (passkeyData: PasskeyVerifyStartData): Promise<PasskeyActionResult> => {
      try {
        const result = await PasskeyService.registerPasskey(passkeyData);
        if (result) {
          return { success: true, message: 'Passkey registration successful' };
        } else {
          const errorMsg = 'Passkey registration failed, please try again';

          return { success: false, error: errorMsg };
        }
      } catch (error: any) {
        let errorMsg = 'An error occurred during registration';

        // Handle different types of errors
        if (error.name === 'NotSupportedError') {
          errorMsg = 'Your device does not support this type of authentication';
        } else if (error.name === 'SecurityError') {
          errorMsg = 'Security verification failed, please ensure your connection is secure';
        } else if (error.name === 'NotAllowedError') {
          errorMsg = 'User cancelled authentication or operation timed out';
        } else if (error.name === 'InvalidStateError') {
          errorMsg =
            'This device has already been registered, please try verification instead of re-registration';
        } else if (error.message) {
          errorMsg = error.message;
        }

        addNotification({
          type: 'error',
          title: 'Registration Error',
          message: errorMsg,
        });

        return { success: false, error: errorMsg };
      }
    },
    [addNotification, passkeyRegister]
  );

  return { registerPasskey };
}

export function usePasskeyDialogContent(
  currentMode: PasskeyMode,
  isDetecting: boolean,
  onRegister: () => void,
  onVerify: () => void
) {
  const getDialogContent = useCallback(() => {
    if (currentMode === 'auto_detect' || isDetecting) {
      return {
        title: 'Detecting Passkey Status',
        description: 'We are checking your passkey status to determine the next step.',
        icon: 'IconLoader2',
        buttonText: 'Detecting...',
        buttonAction: () => {}, // No action during detection
        showCancel: true,
        isDetecting: true,
      };
    } else if (currentMode === 'register') {
      return {
        title: 'Register Passkey',
        description:
          'To ensure account security, you need to register a Passkey. This will use your device for identity verification.',
        icon: 'IconShield',
        buttonText: 'Register Passkey',
        buttonAction: onRegister,
        showCancel: true,
        isDetecting: false,
      };
    } else if (currentMode === 'verify_after_register') {
      return {
        title: 'Verify Passkey',
        description:
          'Passkey registration successful! Now we need to verify that the newly registered credential works properly.',
        icon: 'IconShieldCheck',
        buttonText: 'Verify Credential',
        buttonAction: onVerify,
        showCancel: false, // Verification after registration is not allowed to be cancelled
        isDetecting: false,
      };
    } else {
      return {
        title: 'Verify Passkey',
        description:
          'We detected that you have already registered a Passkey. You need to verify your device to continue.',
        icon: 'IconShieldCheck',
        buttonText: 'Verify Device',
        buttonAction: onVerify,
        showCancel: true,
        isDetecting: false,
      };
    }
  }, [currentMode, isDetecting, onRegister, onVerify]);

  return { getDialogContent };
}
