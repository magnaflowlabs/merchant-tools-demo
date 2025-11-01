import { memo } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NavUser } from '@/components/nav-user';
import { type NavigationItemId } from '@/config/navigation';
import { cn } from '@/lib/utils';

interface SiteHeaderProps {
  selectedItem?: NavigationItemId | string;

  className?: string;
}

function SiteHeaderComponent({ selectedItem, className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-(--header-height) shrink-0 items-center gap-2 border-b',
        'transition-[width,height] ease-linear',
        'group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)',
        className
      )}
      role="banner"
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
        <div className="ml-auto flex items-center gap-2">
          <NavUser />
        </div>
      </div>
    </header>
  );
}

export const SiteHeader = memo(SiteHeaderComponent);
