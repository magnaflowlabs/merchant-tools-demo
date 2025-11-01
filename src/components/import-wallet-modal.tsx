import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { IconFileImport } from '@tabler/icons-react';
import { toast } from 'sonner';
import { importKeystore } from '@/services/importKeystore';
import { ToggleVisibilityButton } from '@/components/customerUI';
import { logger } from '@/utils/logger';

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File, walletName: string, keystoreData: string, password: string) => void;
  onCreateWallet: () => void;
}

export function ImportWalletModal({
  isOpen,
  onClose,
  onImport,
  onCreateWallet,
}: ImportWalletModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jsonContent, setJsonContent] = useState<string>('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // basic size limit: 2MB
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File too large (max 2MB)');
        event.target.value = '';
        return;
      }
      if (!file.name.endsWith('.json')) {
        toast.error('Please select a JSON file');
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          // minimal keystore structure validation
          const isValidKeystore =
            (typeof data === 'object' && data !== null &&
              (data.crypto || data.Crypto || data['x-ethers'])) || false;
          if (!isValidKeystore) {
            toast.error('Invalid keystore structure');
            event.target.value = '';
            return;
          }
          setSelectedFile(file);
          setJsonContent(content);
          setIsPasswordModalOpen(true);
        } catch (error) {
          logger.error('JSON parsing error', error);
          toast.error('Invalid file format, please select a valid JSON file');
        }
      };

      reader.onerror = () => {
        toast.error('File reading failed');
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handlePasswordSubmit = async () => {
    setPasswordError('');
    if (!password.trim()) {
      setPasswordError('Please enter password');
      return;
    }

    if (!jsonContent || !selectedFile) {
      toast.error('Invalid file data');
      return;
    }

    setIsLoading(true);

    try {
      const result = await importKeystore(jsonContent, password);
      if (result.success) {
        const walletName = result.walletName || selectedFile.name.replace('.json', '');

        onImport(selectedFile, walletName, jsonContent, password);
        onClose();
        resetForm();
      } else {
        setPasswordError(
          result.errorMessage ||
            'Unknown error occurred while importing wallet, please check file format and password'
        );
      }
    } catch (error) {
      logger.error('Error importing wallet', error);
      setPasswordError(
        'Unknown error occurred while importing wallet, please check file format and password'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setSelectedFile(null);
    setJsonContent('');
    setIsPasswordModalOpen(false);
    setIsLoading(false);
    setPasswordError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) {
      setPasswordError('');
    }
  };

  const handlePasswordModalClose = () => {
    setIsPasswordModalOpen(false);
    setPasswordError('');
    setPassword('');
    setSelectedFile(null);
    setJsonContent('');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Import Wallet</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <Button
                onClick={() => document.getElementById('keystore-file')?.click()}
                className="w-full flex items-center gap-2"
              >
                <IconFileImport className="h-4 w-4" />
                Open Keystore File
              </Button>

              <Button variant="outline" onClick={onCreateWallet} className="w-full">
                Don't have a Keystore? Create Wallet
              </Button>
            </div>

            <input
              id="keystore-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordModalOpen} onOpenChange={handlePasswordModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              Enter Keystore Password
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Please enter Keystore password"
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handlePasswordSubmit();
                    }
                  }}
                  disabled={isLoading}
                  className={passwordError ? 'border-red-500 focus:border-red-500' : ''}
                  autoComplete="off"
                />
                <ToggleVisibilityButton
                  isVisible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                />
              </div>
              {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handlePasswordModalClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handlePasswordSubmit} disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
