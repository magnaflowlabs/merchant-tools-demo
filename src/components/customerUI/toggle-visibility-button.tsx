import { Button } from '@/components/ui/button';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

interface ToggleVisibilityButtonProps {
  isVisible: boolean;
  onToggle: () => void;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  iconClassName?: string;
  iconColorClassName?: string;
  className?: string;
  disabled?: boolean;
  visibleLabel?: string;
  hiddenLabel?: string;
}

export function ToggleVisibilityButton({
  isVisible,
  onToggle,
  size = 'sm',
  iconClassName = 'h-4 w-4',
  iconColorClassName = 'text-gray-500',
  className = '',
  disabled = false,
}: ToggleVisibilityButtonProps) {
  const Icon = isVisible ? IconEye : IconEyeOff;
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      onClick={onToggle}
      disabled={disabled}
    >
      <Icon className={`${iconClassName} ${iconColorClassName}`} />
    </Button>
  );
}
