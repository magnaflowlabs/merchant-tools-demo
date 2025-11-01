import { memo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileNav } from './mobile-nav';
import { DesktopNav } from './desktop-nav';

function NavUserComponent() {
  const isMobile = useIsMobile();

  return <>{isMobile ? <MobileNav /> : <DesktopNav />}</>;
}

export const NavUser = memo(NavUserComponent);
