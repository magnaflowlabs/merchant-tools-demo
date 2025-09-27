import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { IconFileImport, IconEye, IconEyeOff } from '@tabler/icons-react';
import { toast } from 'sonner';
import { importKeystore } from '@/services/importKeystore';

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
      // Check file type
      if (!file.name.endsWith('.json')) {
        toast.error('Please select a JSON file');
        return;
      }

      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;

          // Validate JSON format
          JSON.parse(content);

          // Save file content and JSON string
          setSelectedFile(file);
          setJsonContent(content);

          // Show password input modal
          setIsPasswordModalOpen(true);
        } catch (error) {
          console.error('JSON parsing error:', error);
          toast.error('Invalid file format, please select a valid JSON file');
        }
      };

      reader.onerror = () => {
        toast.error('File reading failed');
      };

      // Read file as text
      reader.readAsText(file);
    }
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
      // Call importKeystore function
      const result = await importKeystore(jsonContent, password);

      if (result.success) {
        const walletName = result.walletName || selectedFile.name.replace('.json', '');

        onImport(selectedFile, walletName, jsonContent, password);
        onClose();
        resetForm();
      } else if (result.errorMessage && !result.success) {
        setPasswordError(result.errorMessage);
      }
    } catch (error) {
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
    // When user starts to input, clear the error information
    if (passwordError) {
      setPasswordError('');
    }
  };

  const handlePasswordModalClose = () => {
    setIsPasswordModalOpen(false);
    setPasswordError('');
    setPassword('');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Import Wallet</DialogTitle>
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
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Wallet Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Please enter Keystore password"
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handlePasswordSubmit();
                    }
                  }}
                  disabled={isLoading}
                  className={passwordError ? 'border-red-500 focus:border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {!showPassword ? (
                    <IconEyeOff className="h-4 w-4" />
                  ) : (
                    <IconEye className="h-4 w-4" />
                  )}
                </Button>
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
