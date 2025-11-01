import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ExpandableToastContentProps {
  items: string[];
  maxItemsBeforeCollapse?: number;
  initialDisplayCount?: number;
}

export function ExpandableToastContent({
  items,
  maxItemsBeforeCollapse = 15,
  initialDisplayCount = 5,
}: ExpandableToastContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Render a single item
  const renderItem = (item: string, index: number) => (
    <div
      key={index}
      className="text-sm leading-relaxed whitespace-nowrap w-full animate-in fade-in-50 duration-200"
      style={{
        animationDelay: `${index * 20}ms`,
      }}
    >
      {item}
    </div>
  );

  // If the data doesn't exceed the threshold, display all items directly
  if (items.length <= maxItemsBeforeCollapse) {
    return (
      <>
        <h3 className="text-md font-semibold text-center flex items-center justify-center gap-2 mb-1">
          SUCCESS <Check size={20} />
        </h3>
        <div className="flex flex-col gap-1.5 overflow-y-auto overflow-x-auto w-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {items.map(renderItem)}
        </div>
      </>
    );
  }

  // Data exceeds threshold, use Collapsible component
  const initialItems = items.slice(0, initialDisplayCount);
  const collapsedItems = items.slice(initialDisplayCount);
  const remainingCount = collapsedItems.length;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="w-full">
      <h3 className="text-md font-semibold text-center flex items-center justify-center gap-2 mb-1">
        SUCCESS <Check size={20} />
      </h3>
      {/* Content area - scrollable when expanded */}
      <div
        className={cn(
          'flex flex-col gap-1.5 w-full overflow-x-auto',
          isExpanded && 'max-h-[300px] overflow-y-auto',
          isExpanded &&
            'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'
        )}
      >
        {/* Initial items always displayed */}

        <div className="flex flex-col gap-1.5 w-full">{initialItems.map(renderItem)}</div>

        {/* Other expandable items */}
        <CollapsibleContent className="flex flex-col gap-1.5 w-full">
          {collapsedItems.map((item, index) => renderItem(item, index + initialDisplayCount))}
        </CollapsibleContent>
      </div>

      {/* Expand/collapse button */}
      <CollapsibleTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex items-center justify-center gap-1.5 w-full',
            'text-sm font-medium',
            'text-primary hover:text-primary/80',
            'transition-all duration-200',
            'mt-2 pt-2.5 pb-0.5',
            'border-t border-border',
            'group cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'rounded-sm'
          )}
          type="button"
        >
          {isExpanded ? (
            <>
              <span>Collapse</span>
              <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            </>
          ) : (
            <>
              <span>Show more ({remainingCount} items)</span>
              <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
            </>
          )}
        </button>
      </CollapsibleTrigger>
    </Collapsible>
  );
}
