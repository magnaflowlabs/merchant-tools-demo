import { memo } from 'react';
import { SelectItem } from '../ui/select';
import { cn } from '@/lib/utils';
import { getChainColor, getChainDisplayName, ANIMATION_DELAY_MS, ICON_SIZE } from './chain-utils';

interface ChainSelectItemProps {
  chainConfig: {
    chain: string;
    chain_name?: string;
    name?: string;
    [key: string]: any;
  };
  index: number;
}

export const ChainSelectItem = memo<ChainSelectItemProps>(({ chainConfig, index }) => {
  const displayName = getChainDisplayName(chainConfig);
  const chainColor = getChainColor(chainConfig.chain);

  return (
    <SelectItem
      value={chainConfig.chain}
      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:shadow-sm focus:bg-accent/50 focus:shadow-sm data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:border data-[state=checked]:border-primary/20 data-[state=checked]:shadow-sm animate-in slide-in-from-left-2 fade-in-0 [&>span:first-child]:hidden"
      style={{ animationDelay: `${index * ANIMATION_DELAY_MS}ms` }}
    >
      <div className="flex items-center gap-3 w-full">
        <div
          className={cn(
            ICON_SIZE,
            'rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-semibold text-white shadow-sm',
            chainColor
          )}
        >
          {displayName.charAt(0)}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium leading-tight">{displayName}</span>
        </div>
      </div>

      <div className="absolute right-3 opacity-0 group-data-[state=checked]:opacity-100 transition-all duration-200 transform scale-75 group-data-[state=checked]:scale-100">
        <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
        </div>
      </div>
    </SelectItem>
  );
});

ChainSelectItem.displayName = 'ChainSelectItem';
