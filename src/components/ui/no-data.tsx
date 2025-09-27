import { Inbox } from 'lucide-react';

interface NoDataProps {
  message?: string;
  iconSize?: number;
  className?: string;
}

export function NoData({
  message = 'No Data',
  iconSize = 48,
  className = '',
}: NoDataProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-gray-300 ${className}`}
    >
      <Inbox size={iconSize} strokeWidth={1.2} />
      <div className="text-lg">{message}</div>
    </div>
  );
}
