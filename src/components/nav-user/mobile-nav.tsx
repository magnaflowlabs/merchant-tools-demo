import { IconMenu2, IconUserCircle } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MobileMenuContent } from './mobile-menu-content';

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground"
        >
          <IconMenu2 className="h-5 w-5" />
          <IconUserCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>User</SheetTitle>
        </SheetHeader>
        <MobileMenuContent />
      </SheetContent>
    </Sheet>
  );
}
