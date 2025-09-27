import { SidebarTrigger } from '@/components/ui/sidebar';
import { NavUser } from '@/components/nav-user';
interface SiteHeaderProps {
  selectedItem?: string;
}
export function SiteHeader({ selectedItem }: SiteHeaderProps) {
  const getTitle = () => {
    switch (selectedItem) {
      case 'merchant.content':
        return 'Merchant Content';
      case 'create.wallet':
        return 'Create Wallet';
      default:
        return '';
    }
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <h2 className="text-base font-medium hidden lg:block">{getTitle()}</h2>
        <div className="ml-auto flex items-center gap-2">
          <NavUser />
        </div>
      </div>
    </header>
  );
}
