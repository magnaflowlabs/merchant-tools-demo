export { PasskeyDialog } from './passkey-dialog';

export type {
  PasskeyMode,
  PasskeyDialogContent,
  PasskeyState,
  PasskeyActionResult,
  PasskeyError,
  PasskeyServiceInterface,
  PasskeyWebSocketService,
} from './types';

export {
  usePasskeyState,
  usePasskeyAutoDetect,
  usePasskeyRegister,
  usePasskeyDialogContent,
} from './hooks';
