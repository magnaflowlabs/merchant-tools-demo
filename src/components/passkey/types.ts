import type { PasskeyVerifyStartData } from '@/auth/types';

export type PasskeyMode = 'register' | 'verify' | 'verify_after_register' | 'auto_detect';

export interface PasskeyDialogContent {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  buttonText: string;
  buttonAction: () => void;
  showCancel: boolean;
  isDetecting: boolean;
}

export interface PasskeyState {
  isProcessing: boolean;
  currentMode: PasskeyMode;
  isDetecting: boolean;
  passkeyData: PasskeyVerifyStartData | null;
}

export interface PasskeyActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface PasskeyError {
  name: string;
  message: string;
}

export interface PasskeyServiceInterface {
  registerPasskey: (data: PasskeyVerifyStartData) => Promise<boolean>;
  smartVerify: (data: PasskeyVerifyStartData) => Promise<boolean>;
  getPasskeyStatus: () => any;
}

export interface PasskeyWebSocketService {
  passkeyVerifyStart: () => Promise<any>;
  isConnected: () => boolean;
  disconnect: () => void;
}
