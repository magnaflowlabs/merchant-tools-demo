import { useMemo, useState } from 'react';
import { IconWallet, IconLogout, IconChevronDown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore, useWalletStore, useSyncConfigStore, useMerchantStore } from '@/stores';

import { ImportWalletModal } from '@/components/import-wallet-modal';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconHelp } from '@tabler/icons-react';
import { getMnemonicFromKeystore, generateTronChildAddress } from '@/utils/bip32-utils';
import { initializeGlobalTronWeb } from '@/utils/tronweb-manager';

interface KeystoreWalletButtonProps {
  className?: string;
}

export function KeystoreWalletButton({ className }: KeystoreWalletButtonProps) {
  const { isAdmin, user } = useAuthStore();
  const {
    isWalletImported,
    walletName,
    setWalletImported,
    clearWallet,
    keystore_id,
    storeWalletMnemonic,
  } = useWalletStore();
  const { setIsSyncingAddress } = useSyncConfigStore();
  const { cancelCollecting } = useMerchantStore();

  const navigate = useNavigate();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const isValidKeystore = useMemo(() => {
    return !!(user?.keystore_id === keystore_id || !user?.keystore_id);
  }, [user?.keystore_id, keystore_id]);

  const handleRemoveWallet = () => {
    clearWallet();
    cancelCollecting();
    setIsSyncingAddress(false);
  };

  const handleImportWallet = async (
    _file: File,
    walletName: string,
    keystoreData: string,
    password: string
  ) => {
    try {
      const jsonData = JSON.parse(keystoreData);
      const mnemonic = await getMnemonicFromKeystore(keystoreData, password);
      const resp = await generateTronChildAddress(mnemonic, 0);
      const { address: zeroChildAddress } = resp;
      const { address } = jsonData;

      setWalletImported({
        imported: true,
        name: walletName,
        address,
        keystoreData: keystoreData,
        password: password,
        keystore_id: zeroChildAddress,
      });

      storeWalletMnemonic(mnemonic);

      try {
        initializeGlobalTronWeb('nile');
      } catch (error) {
        console.error('initialize global TronWeb instance failed:', error);
      }

      toast.success(`Keystore imported success: ${walletName}`);
    } catch (error) {
      console.error('error when handling keystore file:', error);
      toast.error('Invalid keystore file format');
    }
  };

  const handleCreateWallet = () => {
    setIsImportModalOpen(false);
    navigate('/dashboard?view=create-wallet');
  };

  const handleWalletButtonClick = () => {
    if (!isWalletImported) {
      setIsImportModalOpen(true);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      {isWalletImported && walletName ? (
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-2 px-3 py-2  ${
                  isValidKeystore
                    ? 'text-emerald-700 hover:text-emerald-800'
                    : 'text-red-500 hover:text-red-600'
                } hover:bg-emerald-50  ${className || ''}`}
              >
                <IconWallet className="h-4 w-4" />
                <span className="text-sm">{walletName}</span>

                <IconChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto">
              <DropdownMenuItem onClick={handleRemoveWallet}>
                <IconLogout className="h-4 w-4" />
                <span className="text-sm">Remove Wallet</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!isValidKeystore && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <IconHelp className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span>
                  please use the correct keystore file, otherwise the function cannot be used
                  normally
                </span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground ${className || ''}`}
          onClick={handleWalletButtonClick}
        >
          <IconWallet className="h-4 w-4" />
          <span className="text-sm">Import Keystore File</span>
        </Button>
      )}

      <ImportWalletModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportWallet}
        onCreateWallet={handleCreateWallet}
      />
    </>
  );
}
