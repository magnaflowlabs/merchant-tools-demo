import { IconWallet, IconTools, type Icon } from '@tabler/icons-react';

export type NavigationItemId = 'merchant.content' | 'create.wallet';

export interface NavigationItem {
  id: NavigationItemId;
  title: string;
  icon: Icon;
  url: string;
  requiresAdmin?: boolean;
}

export const NAVIGATION_ITEMS: Record<NavigationItemId, NavigationItem> = {
  'merchant.content': {
    id: 'merchant.content',
    title: 'Tools',
    icon: IconTools,
    url: '#',
    requiresAdmin: false,
  },
  'create.wallet': {
    id: 'create.wallet',
    title: 'Create Wallet',
    icon: IconWallet,
    url: '#',
    requiresAdmin: true,
  },
} as const;

export function getNavigationItems(isAdmin: boolean = false): NavigationItem[] {
  return Object.values(NAVIGATION_ITEMS).filter((item) => !item.requiresAdmin || isAdmin);
}
