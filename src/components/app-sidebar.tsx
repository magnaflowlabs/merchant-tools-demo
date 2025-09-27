import * as React from 'react';
import { IconWallet, IconDashboard, IconTools } from '@tabler/icons-react';
import { useAuthStore } from '@/stores';

import { NavMain } from '@/components/nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selectedItem?: string;
  onItemClick?: (item: string) => void;
}

export function AppSidebar({ selectedItem, onItemClick, ...props }: AppSidebarProps) {
  const { isAdmin } = useAuthStore();

  const data = {
    user: {
      name: 'shadcn',
      email: 'm@example.com',
      avatar: '/avatars/shadcn.jpg',
    },
    navMain: [
      {
        title: 'Merchant Content',
        url: '#',
        icon: IconTools,
      },
      ...(isAdmin
        ? [
            {
              title: 'Create Wallet',
              url: '#',
              icon: IconWallet,
            },
          ]
        : []),
    ],
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#">
                <IconDashboard className="!size-5" />
                <span className="text-base font-semibold">Merchant Tools</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} selectedItem={selectedItem} onItemClick={onItemClick} />
      </SidebarContent>
    </Sidebar>
  );
}
