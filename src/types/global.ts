import type { ChainInfo } from './merchant';
export interface UserInfo {
  merchant_id: string;
  role: string;
  user_id: string;
  username: string;
  keystore_id?: string;
  collection_addresses?: ChainInfo[];
}

export interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  connUrl: string;
  username: string;
  cur_chain: ChainInfo;
  setCurChain: (chain: ChainInfo) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  login: (username: string, password: string, conn_url: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: UserInfo | null) => void;
}
