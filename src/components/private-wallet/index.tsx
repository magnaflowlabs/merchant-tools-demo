import { useState } from 'react';
import { privateKeyManager } from '@/services/PrivateKeyManager';
import { useMerchantStore } from '@/stores/merchant-store';
import { usePrivateKeyConnection, useWalletBalance, useCopyAddress } from './hooks';
import { PrivateKeyInputDialog } from './private-key-input-dialog';
import { CustomWalletSelectButton } from './custom-wallet-select-button';
import { WalletDropdown } from './wallet-dropdown';

export function WalletConnectionByAddress() {
  const [showPrivateKeyDialog, setShowPrivateKeyDialog] = useState(false);
  const stopAutoPaying = useMerchantStore((state) => state.stopAutoPaying);

  const { privateKeyConnected, privateKeyAddress, setPrivateKeyAddress, setPrivateKeyConnected } =
    usePrivateKeyConnection();

  const { trxBalance, usdtBalance, isRefreshing, refreshBalances, setTrxBalance, setUsdtBalance } =
    useWalletBalance(privateKeyConnected, privateKeyAddress);

  const { copied, copyAddress } = useCopyAddress();

  const handlePrivateKeyConnect = (privateKey: string, address: string) => {
    privateKeyManager.storePrivateKey(privateKey, address);
    setPrivateKeyAddress(address);
    setPrivateKeyConnected(true);
  };

  const handleDisconnectPrivateKey = () => {
    privateKeyManager.clearPrivateKey();
    setPrivateKeyAddress('');
    setPrivateKeyConnected(false);
    setTrxBalance('');
    setUsdtBalance('');
    stopAutoPaying();
  };

  const isConnected = privateKeyConnected;
  const currentAddress = privateKeyConnected ? privateKeyAddress : '';

  return (
    <>
      {isConnected ? (
        <WalletDropdown
          address={currentAddress}
          trxBalance={trxBalance}
          usdtBalance={usdtBalance}
          copied={copied}
          isRefreshing={isRefreshing}
          onCopyAddress={() => copyAddress(currentAddress)}
          onRefreshBalances={refreshBalances}
          onDisconnect={handleDisconnectPrivateKey}
          isPrivateKeyConnection={privateKeyConnected}
        />
      ) : (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <CustomWalletSelectButton
            onClick={() => {
              setShowPrivateKeyDialog(true);
            }}
          />
        </div>
      )}

      <PrivateKeyInputDialog
        isOpen={showPrivateKeyDialog}
        onClose={() => setShowPrivateKeyDialog(false)}
        onConnect={handlePrivateKeyConnect}
      />
    </>
  );
}
