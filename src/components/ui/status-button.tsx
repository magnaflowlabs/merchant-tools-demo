import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'processing'
  | 'pending'
  | 'completed'
  | 'failed';

interface StatusButtonProps {
  status: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

const statusConfig = {
  success: {
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    outlineClassName: 'text-emerald-700 border-emerald-300 hover:bg-emerald-50',
    ghostClassName: 'text-emerald-700 hover:bg-emerald-50',
  },
  warning: {
    className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    outlineClassName: 'text-amber-700 border-amber-300 hover:bg-amber-50',
    ghostClassName: 'text-amber-700 hover:bg-amber-50',
  },
  error: {
    className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    outlineClassName: 'text-rose-700 border-rose-300 hover:bg-rose-50',
    ghostClassName: 'text-rose-700 hover:bg-rose-50',
  },
  info: {
    className: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
    outlineClassName: 'text-sky-700 border-sky-300 hover:bg-sky-50',
    ghostClassName: 'text-sky-700 hover:bg-sky-50',
  },
  processing: {
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    outlineClassName: 'text-indigo-700 border-indigo-300 hover:bg-indigo-50',
    ghostClassName: 'text-indigo-700 hover:bg-indigo-50',
  },
  pending: {
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    outlineClassName: 'text-orange-700 border-orange-300 hover:bg-orange-50',
    ghostClassName: 'text-orange-700 hover:bg-orange-50',
  },
  completed: {
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    outlineClassName: 'text-emerald-700 border-emerald-300 hover:bg-emerald-50',
    ghostClassName: 'text-emerald-700 hover:bg-emerald-50',
  },
  failed: {
    className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    outlineClassName: 'text-rose-700 border-rose-300 hover:bg-rose-50',
    ghostClassName: 'text-rose-700 hover:bg-rose-50',
  },
};

export function StatusButton({
  status,
  children,
  className,
  disabled = false,
  onClick,
  size = 'md',
  variant = 'default',
}: StatusButtonProps) {
  const config = statusConfig[status?.toLowerCase() as StatusType];

  const getStatusClassName = () => {
    switch (variant) {
      case 'outline':
        return config.outlineClassName;
      case 'ghost':
        return config.ghostClassName;
      default:
        return config.className;
    }
  };

  const sizeClasses = {
    sm: 'h-7 px-2 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  };

  return (
    <Button
      className={cn(
        'font-medium transition-colors',
        getStatusClassName(),
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      onClick={onClick}
      variant={variant}
    >
      {children}
    </Button>
  );
}

export function SuccessButton(props: Omit<StatusButtonProps, 'status'>) {
  return <StatusButton status="success" {...props} />;
}

export function WarningButton(props: Omit<StatusButtonProps, 'status'>) {
  return <StatusButton status="warning" {...props} />;
}

export function ErrorButton(props: Omit<StatusButtonProps, 'status'>) {
  return <StatusButton status="error" {...props} />;
}

export function InfoButton(props: Omit<StatusButtonProps, 'status'>) {
  return <StatusButton status="info" {...props} />;
}

export function ProcessingButton(props: Omit<StatusButtonProps, 'status'>) {
  return <StatusButton status="processing" {...props} />;
}

export function PendingButton(props: Omit<StatusButtonProps, 'status'>) {
  return <StatusButton status="pending" {...props} />;
}

export function CompletedButton(props: Omit<StatusButtonProps, 'status'>) {
  return <StatusButton status="completed" {...props} />;
}

export function FailedButton(props: Omit<StatusButtonProps, 'status'>) {
  return <StatusButton status="failed" {...props} />;
}
