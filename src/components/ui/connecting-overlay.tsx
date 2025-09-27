import React from 'react';
import { Loader2 } from 'lucide-react';

interface ConnectingOverlayProps {
  message?: string;
}

export const ConnectingOverlay: React.FC<ConnectingOverlayProps> = ({
  message = 'Connecting...',
}) => {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 p-12">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="text-lg text-white/90 font-medium">{message}</p>
      </div>
    </div>
  );
};
