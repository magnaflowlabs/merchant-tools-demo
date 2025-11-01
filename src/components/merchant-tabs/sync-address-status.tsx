import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, useWalletStore, useSyncConfigStore, useShallow } from '@/stores';
import { IconHelp } from '@tabler/icons-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { AddressUsageStatus } from '@/components/address-usage-status';
import { WorkAutoButton } from '@/components/customerUI';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { kitUpdateProfile, kitGetProfile } from '@/services/ws/api';
import { toast } from 'sonner';
import type { MerchantProfile } from '@/services/ws/type';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { useWebSocketService } from '@/services/ws/hooks';
import { KeystoreWalletButton } from '@/components/keystore-wallet-button';
export function SyncAddressStatus() {
  const { isAdmin, setProfileData, profileData } = useAuthStore(
    useShallow((state) => ({
      isAdmin: state.isAdmin,
      setProfileData: state.setProfileData,
      profileData: state.profileData,
    }))
  );
  const { ws } = useWebSocketService();
  // Get current chain from chain config store
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);
  const { isWalletImported, keystore_id } = useWalletStore(
    useShallow((state) => ({
      isWalletImported: state.isWalletImported,
      keystore_id: state.keystore_id,
    }))
  );

  const {
    minSubAccountThreshold,
    autoGenerateAddressCount,
    isSyncingAddress,
    setMinSubAccountThreshold,
    setAutoGenerateAddressCount,
    setIsSyncingAddress,
  } = useSyncConfigStore(
    useShallow((state) => ({
      minSubAccountThreshold: state.minSubAccountThreshold,
      autoGenerateAddressCount: state.autoGenerateAddressCount,
      isSyncingAddress: state.isSyncingAddress,
      setMinSubAccountThreshold: state.setMinSubAccountThreshold,
      setAutoGenerateAddressCount: state.setAutoGenerateAddressCount,
      setIsSyncingAddress: state.setIsSyncingAddress,
    }))
  );

  const handleAddressList = async () => {
    setIsSyncingAddress(!isSyncingAddress);
  };
  const isValidKeystore = useMemo(() => {
    return profileData?.keystore_id === keystore_id;
  }, [keystore_id, profileData?.keystore_id]);

  const handleBindKeystoreId = async () => {
    if (!keystore_id) {
      return;
    }
    try {
      const response = await kitUpdateProfile({ keystore_id: keystore_id });

      if (response?.code === 200) {
        const response = await kitGetProfile();

        if (response?.code === 200 && response?.data) {
          const profileDataRes = response?.data as MerchantProfile;

          if (profileDataRes) {
            // Only update user info, curCollectionAddressInfo will be automatically derived via useCollectionAddressInfo
            setProfileData(profileDataRes);
          }
        } else {
          console.error('Failed to get configuration: ' + (response?.error || 'Unknown error'));
        }
      }
    } catch (error: any) {
      console.error(typeof error);
      if (error?.code === 409) {
        toast.error('This keystore file is already in use by another user', {
          style: {
            width: 'auto',
            whiteSpace: 'pre',
          },
        });
      } else {
        toast.error(`${error?.error || 'kit Update Profile error'}`);
      }
    }
  };
  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-background flex-wrap ">
          <div className="flex items-center gap-3">
            <label htmlFor="auto-generate" className="text-sm font-medium">
              Auto-generate addresses
            </label>
            <Input
              id="auto-generate"
              type="number"
              value={autoGenerateAddressCount}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive integers
                if (value === '' || /^\d+$/.test(value)) {
                  setAutoGenerateAddressCount(value);
                }
              }}
              onBlur={(e) => setAutoGenerateAddressCount(e.target.value || '1')}
              className="w-20 min-w-30"
              min="1"
              max="100"
              disabled={!isWalletImported || isSyncingAddress}
            />
            <span>items</span>
          </div>
          <Separator orientation="vertical" className="!h-[26px] bg-neutral-600 hidden md:block" />
          <div className="flex items-center gap-3">
            <label htmlFor="min-sub-account-threshold" className="text-sm font-medium">
              When unused addresses fall below
            </label>
            <Input
              id="min-sub-account-threshold"
              type="number"
              value={minSubAccountThreshold}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setMinSubAccountThreshold(value);
                }
              }}
              onBlur={(e) => setMinSubAccountThreshold(e.target.value || '1')}
              className="w-20 min-w-30"
              min="1"
              max="100"
              disabled={!isWalletImported || isSyncingAddress}
            />
            <span>items</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-2">
              {isWalletImported && (
                <WorkAutoButton
                  isActive={isSyncingAddress}
                  onToggle={handleAddressList}
                  startLabel="Auto Sync"
                  stopLabel="Stop Sync"
                  disabled={!isWalletImported || !isValidKeystore || !curChainConfig.chain}
                />
              )}
              {/* <button
                onClick={() => {
                  ws.disconnect();
                }}
                className="px-2 py-1 rounded border text-xs"
              >
                Disconnect WS Service
              </button> */}
              {!profileData?.keystore_id && isWalletImported && ws.isConnected() && (
                <Button onClick={handleBindKeystoreId} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Bind Keystore ID
                </Button>
              )}
              {!isWalletImported && (
                <KeystoreWalletButton className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 hover:text-white" />
              )}
            </div>
            {!(isWalletImported && isValidKeystore && curChainConfig.chain) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconHelp className="h-5 w-5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] sm:max-w-[400px] lg:max-w-[500px] p-4 space-y-2">
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>
                      1. Import your{' '}
                      <span className="font-semibold text-blue-600">Keystore file</span> (top navbar
                      button).
                    </p>
                    <p>
                      2. If no chain is selected, go to the{' '}
                      <span className="font-semibold text-orange-600">merchant backend</span> to
                      configure it.
                    </p>
                    <p>3. First-time users: upload your keystore_id.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      <AddressUsageStatus />
    </div>
  );
}
