import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { NoData } from '@/components/ui/no-data';
import { CurstomerTD, StatusBadge, ExternalLinkButton } from '@/components/customerUI';
import type { CollectionHistory } from '@/services/ws/type';
import { Loader2 } from 'lucide-react';
import { strip0x, formatNumber } from '@/utils';
import BigNumber from 'bignumber.js';
import { useTokenDecimal } from '@/hooks/use-token-decimal';
interface CollectionHistoryTableProps {
  historyData: CollectionHistory[];
  isRefreshing?: boolean;
}

export function CollectionHistoryTable({
  historyData = [],
  isRefreshing = false,
}: CollectionHistoryTableProps) {
  const { getTokenDecimal } = useTokenDecimal();
  return (
    <div className="space-y-4 relative">
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-max whitespace-nowrap">
          <thead className="bg-gray-50">
            <tr>
              <CurstomerTD className="font-medium">User ID</CurstomerTD>
              <CurstomerTD className="font-medium">TX Hash</CurstomerTD>
              <CurstomerTD className="font-medium">From</CurstomerTD>
              <CurstomerTD className="font-medium">To</CurstomerTD>
              <CurstomerTD className="font-medium">Amount</CurstomerTD>
              <CurstomerTD className="font-medium">Time</CurstomerTD>
              <CurstomerTD className="font-medium">Status</CurstomerTD>
            </tr>
          </thead>
          <tbody>
            {historyData.length > 0 ? (
              historyData.map((item) => (
                <tr key={item.id || item.txhash} className="border-t hover:bg-gray-50">
                  <CurstomerTD>{item.user_id}</CurstomerTD>

                  <CurstomerTD>
                    <ExternalLinkButton hash={strip0x(item.txhash)}>
                      <TRC20AddressDisplay address={strip0x(item.txhash)} />
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
                  <CurstomerTD className="text-md">{`${formatNumber(
                    new BigNumber(item.amount)
                      .div(Math.pow(10, getTokenDecimal(item?.token) ?? 0))
                      .toString()
                  )} ${item.token?.toUpperCase()}`}</CurstomerTD>

                  <CurstomerTD>{new Date(Number(item.block_ms)).toLocaleString()}</CurstomerTD>
                  <CurstomerTD>
                    <StatusBadge status={item.status}>{item.status?.toUpperCase()}</StatusBadge>
                  </CurstomerTD>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8">
                  <NoData message="No Data" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Loading overlay */}
      {isRefreshing && (
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
