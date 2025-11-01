import * as React from 'react';
import { memo, useMemo } from 'react';
import { IconDashboard } from '@tabler/icons-react';
import { useAuthStore, useShallow } from '@/stores';
import { getNavigationItems, type NavigationItemId } from '@/config/navigation';

import { NavMain } from '@/components/nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { VERSION } from '@/config/constants';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selectedItem?: NavigationItemId | string;
  onItemClick?: (itemId: NavigationItemId) => void;
}

function AppSidebarComponent({ selectedItem, onItemClick, ...props }: AppSidebarProps) {
  const { isAdmin } = useAuthStore(
    useShallow((state) => ({
      isAdmin: state.isAdmin,
    }))
  );

  const navigationItems = useMemo(() => {
    return getNavigationItems(isAdmin).map((item) => ({
      title: item.title,
      url: item.url,
      icon: item.icon,
    }));
  }, [isAdmin]);

  const handleItemClick = React.useCallback(
    (title: string) => {
      const navItem = getNavigationItems(isAdmin).find((item) => item.title === title);
      if (navItem && onItemClick) {
        onItemClick(navItem.id);
      }
    },
    [isAdmin, onItemClick]
  );

  const selectedTitle = useMemo(() => {
    const navItem = getNavigationItems(isAdmin).find((item) => item.id === selectedItem);
    return navItem?.title;
  }, [selectedItem, isAdmin]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#" aria-label="Merchant Tools Home">
                <IconDashboard className="!size-5" aria-hidden="true" />
                <span className="text-base font-semibold">Merchant Tools</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navigationItems}
          selectedItem={selectedTitle}
          onItemClick={handleItemClick}
        />
      </SidebarContent>
      <SidebarFooter>
        <span className="text-sm text-gray-500 text-center">Merchant Tools - v{VERSION}</span>
      </SidebarFooter>
    </Sidebar>
  );
}

export const AppSidebar = memo(AppSidebarComponent);
