import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

export type WorkAutoButtonProps = {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  startLabel?: string;
  stopLabel?: string;
  variantActive?: React.ComponentProps<typeof Button>['variant'];
  variantIdle?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export function WorkAutoButton({
  isActive,
  onToggle,
  disabled,
  className,
  startLabel = 'Auto',
  stopLabel = 'Stop',
  variantActive = 'destructive',
  variantIdle = 'default',
  size = 'default',
  Icon = Bot,
}: WorkAutoButtonProps) {
  return (
    <Button
      className={`flex items-center gap-2 ${className ?? ''}`}
      onClick={onToggle}
      variant={isActive ? variantActive : variantIdle}
      disabled={disabled}
      size={size}
    >
      <Icon className={`size-5 ${isActive ? 'animate-spin' : ''}`} />
      {isActive ? stopLabel : startLabel}
    </Button>
  );
}
