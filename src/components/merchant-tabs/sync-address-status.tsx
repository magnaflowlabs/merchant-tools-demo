import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, useWalletStore, useSyncConfigStore } from '@/stores';
import { IconHelp } from '@tabler/icons-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AddressUsageStatus } from '@/components/address-usage-status';
import { WorkAutoButton } from '@/components/customerUI';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { kitUpdateProfile, kitGetProfile } from '@/services/ws/api';
import { toast } from 'sonner';
import type { MerchantProfile } from '@/services/ws/type';

export function SyncAddressStatus() {
  const { isAdmin, user, cur_chain, setUser, setCurChain } = useAuthStore();
  const { isWalletImported, keystore_id } = useWalletStore();
  const {
    minSubAccountThreshold,
    autoGenerateAddressCount,
    isSyncingAddress,
    setMinSubAccountThreshold,
    setAutoGenerateAddressCount,
    setIsSyncingAddress,
  } = useSyncConfigStore();

  const handleAddressList = async () => {
    setIsSyncingAddress(!isSyncingAddress);
  };
  const isValidKeystore = useMemo(() => {
    return user?.keystore_id === keystore_id;
  }, [user?.keystore_id, keystore_id]);

  const handleBindKeystoreId = async () => {
    if (!keystore_id) {
      return;
    }
    try {
      const response = await kitUpdateProfile({ keystore_id: keystore_id });

      if (response?.code === 200) {
        const response = await kitGetProfile();

        if (response?.code === 200 && response?.data) {
          const profileData = response?.data as MerchantProfile;

          if (user) {
            setUser({
              ...user,
              keystore_id: profileData.keystore_id,
              merchant_id: profileData?.merchant_id,
              collection_addresses: profileData?.collection_addresses || [],
            });
            if (profileData?.collection_addresses?.length > 0) {
              const isCurChain = profileData?.collection_addresses?.find(
                (addr) => addr.chain === cur_chain?.chain
              );
              if (cur_chain?.chain && isCurChain) {
                setCurChain(isCurChain);
              } else {
                setCurChain(profileData.collection_addresses[0]);
              }
            }
          }
        } else {
          console.error('Get configuration failed: ' + (response?.error || 'Unknown error'));
        }
      }
    } catch (error: any) {
      console.error(typeof error);
      if (error?.code === 409) {
        toast.error('This keystore file is already in use by someone else.', {
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
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Sync Address Status</h2>

      {isAdmin && (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-background flex-wrap ">
          <div className="flex items-center gap-3">
            <label htmlFor="auto-generate" className="text-sm font-medium">
              Allow Auto Generate Address
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
              When Unused Addresses Below
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
              <WorkAutoButton
                isActive={isSyncingAddress}
                onToggle={handleAddressList}
                startLabel="Auto Sync"
                stopLabel="Stop Sync"
                disabled={!isWalletImported || !isValidKeystore || !cur_chain.chain}
              />
              {!user?.keystore_id && isWalletImported && (
                <Button onClick={handleBindKeystoreId} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Bind Keystore ID
                </Button>
              )}
            </div>
            {!(isWalletImported && isValidKeystore && cur_chain.chain) && (
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
