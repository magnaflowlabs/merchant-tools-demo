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
import {
  useAuthStore,
  useWalletStore,
  useSyncConfigStore,
  useMerchantStore,
  useShallow,
} from '@/stores';

import { ImportWalletModal } from '@/components/import-wallet-modal';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconHelp } from '@tabler/icons-react';
import { getMnemonicFromKeystore, generateTronChildAddress } from '@/utils/bip32-utils';
import { initializeGlobalTronWeb } from '@/utils/tronweb-manager';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { logger } from '@/utils/logger';

interface KeystoreWalletButtonProps {
  className?: string;
}

export function KeystoreWalletButton({ className }: KeystoreWalletButtonProps) {
  const { isAdmin, profileData } = useAuthStore(
    useShallow((state) => ({
      isAdmin: state.isAdmin,
      profileData: state.profileData,
    }))
  );
  const {
    isWalletImported,
    walletName,
    setWalletImported,
    clearWallet,
    keystore_id,
    storeWalletMnemonic,
  } = useWalletStore(
    useShallow((state) => ({
      isWalletImported: state.isWalletImported,
      walletName: state.walletName,
      setWalletImported: state.setWalletImported,
      clearWallet: state.clearWallet,
      keystore_id: state.keystore_id,
      storeWalletMnemonic: state.storeWalletMnemonic,
    }))
  );
  const { setIsSyncingAddress } = useSyncConfigStore(
    useShallow((state) => ({
      setIsSyncingAddress: state.setIsSyncingAddress,
    }))
  );
  const { cancelCollecting } = useMerchantStore(
    useShallow((state) => ({
      cancelCollecting: state.cancelCollecting,
    }))
  );

  const navigate = useNavigate();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);
  const isValidKeystore = useMemo(() => {
    return !!(profileData?.keystore_id === keystore_id || !profileData?.keystore_id);
  }, [profileData, keystore_id]);

  // remove wallet
  const handleRemoveWallet = () => {
    clearWallet();
    cancelCollecting();
    setIsSyncingAddress(false);
  };

  // import keystore file
  const handleImportWallet = async (
    _file: File,
    walletName: string,
    keystoreData: string,
    password: string
  ) => {
    try {
      const jsonData = JSON.parse(keystoreData);

      // 1. get mnemonic from keystore
      const mnemonic = await getMnemonicFromKeystore(keystoreData, password);

      // 2. generate child address 0
      const resp = await generateTronChildAddress(mnemonic, 0);
      //hd wallet child address 0
      const { address: zeroChildAddress } = resp;

      // print parsed JSON data
      const { address } = jsonData;

      // update wallet state, including keystore data and password
      setWalletImported({
        imported: true,
        name: walletName,
        address,
        keystoreData: keystoreData,
        password: password,
        keystore_id: zeroChildAddress,
      });

      // 3. safely store mnemonic (ensure keystore_id is set after setting wallet state)
      await storeWalletMnemonic(mnemonic);

      // initialize global TronWeb instance based on current chain config
      try {
        if (curChainConfig) {
          initializeGlobalTronWeb(curChainConfig);
        } else {
          initializeGlobalTronWeb();
        }
      } catch (error) {
        logger.error('initialize global TronWeb instance failed', error);
      }

      toast.success(`Keystore imported success: ${walletName}`);

      // you can add the logic to redirect to the wallet management page here
    } catch (error) {
      logger.error('error when handling keystore file', error);
      toast.error('Invalid keystore file format');
    }
  };

  // create wallet
  const handleCreateWallet = () => {
    setIsImportModalOpen(false);
    // redirect to create wallet page
    navigate('/dashboard?view=create-wallet');
  };

  // handle wallet button click
  const handleWalletButtonClick = () => {
    if (!isWalletImported) {
      setIsImportModalOpen(true);
    }
  };

  // only admin can see this component
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      {/* <div className="h-4 w-px bg-border" /> */}
      {isWalletImported && walletName ? (
        // show dropdown menu when wallet is imported
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
          <span className="text-sm">Import Keystore</span>
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
