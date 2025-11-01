import type { CollectionAddressInfo } from './merchant';
import type { MerchantProfile } from '@/services/ws/type';

// ==================== User-Related Types ====================

/**
 * User information
 * Note: Keep in sync with UserInfo in src/auth/types.ts and src/services/ws/type.ts
 */
export interface UserInfo {
  merchant_id: string;
  role: string;
  user_id: string;
  username: string;
  keystore_id?: string;
  collection_addresses?: CollectionAddressInfo[];
}

// ==================== Authentication State ====================

/**
 * Authentication state management interface (for Zustand Store)
 */
export interface AuthState {
  user: UserInfo | null;
  profileData: MerchantProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  connUrl: string;
  username: string;
  setIsAdmin: (isAdmin: boolean) => void;
  logout: () => void;
  setUser: (user: UserInfo | null) => void;
  setProfileData: (profileData: MerchantProfile | null) => void;
}

// ==================== UI Component Props Types ====================

/**
 * Chain selector component props
 */
export interface ChainSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}
