import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconKey } from '@tabler/icons-react';
import { ToggleVisibilityButton } from '@/components/customerUI';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTronWeb } from '@/hooks/use-tronweb';
import { validatePrivateKey } from './utils';

interface PrivateKeyInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (privateKey: string, address: string) => void;
}

export function PrivateKeyInputDialog({ isOpen, onClose, onConnect }: PrivateKeyInputDialogProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(true);
  const tronWeb = useTronWeb();

  const handleClose = () => {
    setPrivateKey('');
    setError('');
    onClose();
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError('');

    try {
      const validation = validatePrivateKey(privateKey);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid private key');
        return;
      }

      const address = tronWeb.address.fromPrivateKey(validation.cleanedKey);

      if (!address) {
        setError('Cannot generate valid address from private key');
        return;
      }

      onConnect(validation.cleanedKey, address);
      setPrivateKey('');
      onClose();
    } catch (error) {
      console.error('Private key validation failed:', error);
      setError('Private key validation failed, please check your input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconKey className="h-5 w-5" />
            Enter Private Key to Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Please enter your private key to connect wallet. The private key will be securely stored
            in memory and automatically cleared when you close or refresh the page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showPrivateKey ? 'text' : 'password'}
                placeholder="Enter 64-bit hexadecimal private key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                onKeyDown={handleKeyPress}
                className="font-mono text-sm pr-10"
                autoComplete="off"
              />
              <ToggleVisibilityButton
                isVisible={showPrivateKey}
                onToggle={() => setShowPrivateKey(!showPrivateKey)}
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
