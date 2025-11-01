import { toast } from 'sonner';
import { ExpandableToastContent } from '@/components/ui/expandable-toast-content';

export function showExpandableToast(
  items: string[],
  options?: {
    duration?: number;
    maxItemsBeforeCollapse?: number;
    initialDisplayCount?: number;
  }
) {
  toast.success(
    <div className="w-full max-w-full">
      <ExpandableToastContent
        items={items}
        maxItemsBeforeCollapse={options?.maxItemsBeforeCollapse}
        initialDisplayCount={options?.initialDisplayCount}
      />
    </div>,
    {
      icon: null,

      duration: options?.duration ?? 3000,
      style: {
        width: 'auto',
        height: 'auto',
      },
    }
  );
}
