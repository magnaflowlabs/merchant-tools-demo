import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AddressDisplayProps {
  address: string;
  className?: string;
  showCopyButton?: boolean;
  copyButtonSize?: 'sm' | 'md' | 'lg';
  addressLength?: number;
  addressLengthEnd?: number;
  showTooltip?: boolean;
}

export function AddressDisplay({
  address,
  className,
  showCopyButton = true,
  copyButtonSize = 'sm',
  addressLength = 7,
  addressLengthEnd = 5,
  showTooltip = true,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length <= addressLength * 2 + 4) {
      return addr;
    }
    return `${addr.slice(0, addressLength)}...${addr.slice(-addressLengthEnd)}`;
  };

  // copy address
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buttonSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {showTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-sm hover:text-primary transition-colors">
                {formatAddress(address)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-mono text-xs break-all">{address}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="font-mono text-sm">{formatAddress(address)}</span>
        )}

        {showCopyButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copyToClipboard();
                }}
                className={cn('p-0 h-auto w-auto', buttonSizeClasses[copyButtonSize])}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{copied ? 'copied' : 'copy'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export function TRC20AddressDisplay(props: Omit<AddressDisplayProps, 'addressLength'>) {
  return <AddressDisplay {...props} addressLength={7} addressLengthEnd={5} />;
}

export function EthereumAddressDisplay(props: Omit<AddressDisplayProps, 'addressLength'>) {
  return <AddressDisplay {...props} addressLength={6} />;
}

export function HashAddressDisplay(props: Omit<AddressDisplayProps, 'addressLength'>) {
  return <AddressDisplay {...props} addressLength={10} />;
}
