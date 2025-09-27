import { useMerchantStore } from '@/stores';

import { AddressUsageCard } from '@/components/customerUI/index';

export function AddressUsageStatus() {
  const { addressUsage } = useMerchantStore();
  const { allocated = 0, available = 0 } = addressUsage || {};
  return (
    <div className="space-y-6">
      <AddressUsageCard used={allocated} unused={available} className="w-full" />
    </div>
  );
}
