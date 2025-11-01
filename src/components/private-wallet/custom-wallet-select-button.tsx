import { Button } from '@/components/ui/button';
import { IconKey } from '@tabler/icons-react';

interface CustomWalletSelectButtonProps {
  onClick: (e?: React.MouseEvent) => void;
}

export function CustomWalletSelectButton({ onClick }: CustomWalletSelectButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      className="w-full flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
    >
      <IconKey className="h-4 w-4 text-white" />
      Private Wallet
    </Button>
  );
}
