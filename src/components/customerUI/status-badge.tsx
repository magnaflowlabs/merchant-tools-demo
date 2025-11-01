import { cn, capitalize } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { STATUS_CONFIG } from '@/config/constants';

export type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'processing'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'confirming'
  | 'collecting'
  | 'collectfailed'
  | 'depositing'
  | 'awaitingdeposit'
  | 'collectsuccess';

export enum PayinOrderStatus {
  Pending = 'Pending',
  Collecting = 'Collecting',
  Confirming = 'Confirming',
  CollectFailed = 'CollectFailed',
  Depositing = 'Depositing',
  AwaitingDeposit = 'AwaitingDeposit',
  CollectSuccess = 'CollectSuccess',
}
interface StatusBadgeProps {
  status: string;
  children?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, children, className, size = 'md' }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase();

  const config =
    (STATUS_CONFIG as Record<string, { className: string; style: React.CSSProperties }>)[
      normalized
    ] || STATUS_CONFIG.unknown;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  return (
    <Badge
      className={cn(
        'rounded-md font-medium transition-colors',
        config.className,
        sizeClasses[size],
        className
      )}
      style={config.style}
    >
      {capitalize((children || status) as string)}
    </Badge>
  );
}
