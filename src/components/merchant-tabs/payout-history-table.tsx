import { TRC20AddressDisplay, AddressDisplay } from '@/components/ui/address-display';
import { NoData } from '@/components/ui/no-data';
import { formatNumber, strip0x } from '@/utils';
import type { PayoutHistoryResponse } from '@/services/ws/type';

import { CurstomerTD, StatusBadge, ExternalLinkButton } from '@/components/customerUI';
import { Loader2 } from 'lucide-react';
export interface PayoutHistoryTableProps {
  payoutHistory?: PayoutHistoryResponse | null;
  isLoading?: boolean;
}

export function PayoutHistoryTable({ payoutHistory, isLoading = false }: PayoutHistoryTableProps) {
  return (
    <div className="space-y-4 relative">
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-max whitespace-nowrap">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-left">Bill No</th>
              <th className="px-4 py-3 font-medium text-left">TX Hash</th>
              <th className="px-4 py-3 font-medium text-left">From</th>
              <th className="px-4 py-3 font-medium text-left">To</th>
              <th className="px-4 py-3 font-medium text-left">Amount</th>
              <th className="px-4 py-3 font-medium text-left">Time</th>
              <th className="px-4 py-3 font-medium text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {payoutHistory?.list?.length && payoutHistory?.list?.length > 0 ? (
              payoutHistory?.list?.map((item) => (
                <tr key={item.bill_no} className="border-t hover:bg-gray-50">
                  <CurstomerTD>
                    <AddressDisplay
                      address={item.bill_no}
                      addressLength={100}
                      showTooltip={false}
                    />
                  </CurstomerTD>
                  <CurstomerTD>
                    <ExternalLinkButton hash={strip0x(item.tx_hash)}>
                      <TRC20AddressDisplay address={strip0x(item.tx_hash)} />
                    </ExternalLinkButton>
                  </CurstomerTD>
                  <CurstomerTD>
                    <ExternalLinkButton hash={item.from}>
                      <TRC20AddressDisplay address={item.from} />
                    </ExternalLinkButton>
                  </CurstomerTD>
                  <CurstomerTD>
                    <ExternalLinkButton hash={item.to}>
                      <TRC20AddressDisplay address={item.to} />
                    </ExternalLinkButton>
                  </CurstomerTD>
                  <CurstomerTD>
                    {`${formatNumber(Number(item.amount))} ${item?.token?.toUpperCase()}`}
                  </CurstomerTD>

                  <CurstomerTD>{new Date(item?.block_ms).toLocaleString()}</CurstomerTD>

                  <CurstomerTD>
                    <StatusBadge status={item.status}>{item.status?.toUpperCase()}</StatusBadge>
                  </CurstomerTD>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <NoData message="No Data" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 font-medium">Refreshing...</p>
          </div>
        </div>
      )}
    </div>
  );
}
