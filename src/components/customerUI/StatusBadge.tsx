import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

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

// Deduplicate tailwind class sets to avoid repetition
const baseClasses = {
  emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border border-rose-200',
  sky: 'bg-sky-50 text-sky-700 border border-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  orange: 'bg-orange-50 text-orange-700 border border-orange-200',
  gray: 'bg-gray-50 text-gray-700 border border-gray-200',
} as const;
const baseColorClasses = (color: string) => {
  return `bg-${color}-50 text-${color}-700 border border-${color}-200`;
};
export const statusConfig = {
  success: { className: baseColorClasses('emerald') },
  warning: { className: baseColorClasses('amber') },
  error: { className: baseColorClasses('rose') },
  info: { className: baseColorClasses('sky') },
  processing: { className: baseColorClasses('indigo') },
  pending: { className: baseColorClasses('orange') },
  confirming: { className: baseColorClasses('emerald') },
  completed: { className: baseColorClasses('emerald') },
  collecting: { className: baseColorClasses('indigo') },
  collectfailed: { className: baseColorClasses('rose') },
  failed: { className: baseColorClasses('rose') },
  unknown: { className: baseColorClasses('gray') },
};

export function StatusBadge({ status, children, className, size = 'md' }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase();
  const config =
    (statusConfig as Record<string, { className: string }>)[normalized] || statusConfig.unknown;

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
    >
      {children ?? status}
    </Badge>
  );
}
