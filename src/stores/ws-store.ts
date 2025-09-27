import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { UserInfo } from '@/types/global';

// Use sessionStorage instead of localStorage for persistence
const _sessionStorage = createJSONStorage<{
  token: string;
  wsUrl: string;
  user: UserInfo;
}>(() => sessionStorage);

export const wsStoreAtom = atomWithStorage<{
  token: string;
  wsUrl: string;
  user: UserInfo;
}>(
  '$WS_CONFIG',
  {
    token: '',
    wsUrl: '',
    user: { user_id: '', username: '', role: '', merchant_id: '' },
  },
  _sessionStorage
);
