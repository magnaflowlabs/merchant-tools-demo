import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { NoData } from '@/components/ui/no-data';
import { formatNumber } from '@/utils';
import type { PayoutHistoryResponse } from '@/services/ws/type';
import { CurstomerTD, StatusBadge } from '@/components/customerUI';

export interface PayoutHistoryTableProps {
  payoutHistory?: PayoutHistoryResponse | null;
  isLoading?: boolean;
  scanUrl: string;
}

export function PayoutHistoryTable({
  payoutHistory,
  isLoading = false,
  scanUrl,
}: PayoutHistoryTableProps) {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[900px] md:min-w-full">
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
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  Loading...
                </td>
              </tr>
            ) : (
              <>
                {payoutHistory?.list?.length && payoutHistory?.list?.length > 0 ? (
                  payoutHistory?.list?.map((item) => (
                    <tr key={item.bill_no} className="border-t hover:bg-gray-50">
                      <CurstomerTD>
                        <TRC20AddressDisplay
                          address={item.bill_no}
                          showCopyButton={false}
                          copyButtonSize="sm"
                        />
                      </CurstomerTD>
                      <CurstomerTD>
                        <a
                          href={`${scanUrl}transaction/${item.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <TRC20AddressDisplay address={item.tx_hash} copyButtonSize="sm" />
                        </a>
                      </CurstomerTD>
                      <CurstomerTD>
                        <a
                          href={`${scanUrl}address/${item.from}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <TRC20AddressDisplay address={item.from} copyButtonSize="sm" />
                        </a>
                      </CurstomerTD>
                      <CurstomerTD>
                        <a
                          href={`${scanUrl}address/${item.to}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <TRC20AddressDisplay address={item.to} copyButtonSize="sm" />
                        </a>
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
                      <NoData message="No data available" />
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
