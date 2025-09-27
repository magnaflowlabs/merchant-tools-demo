import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FundCollectionTool } from './merchant-tabs/fund-collection-tool';
import { PaymentTool } from './merchant-tabs/payment-tool';
import { SyncAddressStatus } from './merchant-tabs/sync-address-status';

import { useMerchantStore } from '@/stores/merchant-store';
import { useSyncConfigStore } from '@/stores/sync-config-store';

export function MerchantContent() {
  const { isCollecting, isAutoTopping, isAutoPaying } = useMerchantStore();
  const { isSyncingAddress } = useSyncConfigStore();

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <Tabs defaultValue="sync-address" className="w-full">
        <TabsList className="grid overflow-x-auto w-full grid-cols-3 md:w-full">
          <TabsTrigger value="sync-address" className="relative">
            Sync Address Status
            {isSyncingAddress && (
              <div className="flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse shadow-lg">
                  <div className="h-3 w-3 rounded-full bg-blue-400 animate-ping absolute"></div>
                </div>
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="fund-collection" className="relative">
            Collection Tool
            {(isCollecting || isAutoTopping) && (
              <div className="flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-orange-500 animate-pulse shadow-lg">
                  <div className="h-3 w-3 rounded-full bg-orange-400 animate-ping absolute"></div>
                </div>
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment-tool" className="relative">
            Payment Tool
            {isAutoPaying && (
              <div className="flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-lg">
                  <div className="h-3 w-3 rounded-full bg-green-400 animate-ping absolute"></div>
                </div>
              </div>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync-address" className="mt-6">
          <SyncAddressStatus />
        </TabsContent>

        <TabsContent value="fund-collection" className="mt-6">
          <FundCollectionTool />
        </TabsContent>

        <TabsContent value="payment-tool" className="mt-6">
          <PaymentTool />
        </TabsContent>
      </Tabs>
    </div>
  );
}
