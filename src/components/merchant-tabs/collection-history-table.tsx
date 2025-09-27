import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { NoData } from '@/components/ui/no-data';
import { CurstomerTD, StatusBadge } from '@/components/customerUI';
import type { CollectionHistory } from '@/services/ws/type';
import { getDecimal, formatNumberDev } from '@/utils';
interface CollectionHistoryTableProps {
  historyData: CollectionHistory[];
  scanUrl: string;
}

export function CollectionHistoryTable({ historyData = [], scanUrl }: CollectionHistoryTableProps) {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[900px] md:min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <CurstomerTD className="font-medium">User ID</CurstomerTD>
              <CurstomerTD className="font-medium">TX Hash</CurstomerTD>
              <CurstomerTD className="font-medium">From</CurstomerTD>
              <CurstomerTD className="font-medium">To</CurstomerTD>
              <CurstomerTD className="font-medium">Amount</CurstomerTD>
              <CurstomerTD className="font-medium">Timestamp</CurstomerTD>
              <CurstomerTD className="font-medium">Status</CurstomerTD>
            </tr>
          </thead>
          <tbody>
            {historyData.length > 0 ? (
              historyData.map((item) => (
                <tr key={item.txhash || item.id} className="border-t hover:bg-gray-50">
                  <CurstomerTD>
                    <TRC20AddressDisplay
                      address={item.user_id}
                      copyButtonSize="sm"
                      showCopyButton={false}
                    />
                  </CurstomerTD>

                  <CurstomerTD>
                    <a
                      href={`${scanUrl}transaction/${item.txhash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TRC20AddressDisplay address={item.txhash} copyButtonSize="sm" />
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
                  <CurstomerTD>{`${formatNumberDev(
                    item.amount,
                    getDecimal(item?.token) ?? 0
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
                  <NoData message="No data available" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
