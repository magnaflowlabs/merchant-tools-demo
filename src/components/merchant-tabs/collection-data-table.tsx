import { useState, useEffect } from 'react';
import { useOrderData } from '@/hooks/use-order-data';
import { StatusButton } from '@/components/ui/status-button';
import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { NoData } from '@/components/ui/no-data';
import { Pagination } from '@/components/customerUI';
import type { PayinOrder } from '@/types/merchant';
import { PayinOrderStatus } from '@/types/merchant';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { useChainConfigStore } from '@/stores/chain-config-store';
import type { StatusType } from '@/components/ui/status-button';
import { formatNumber } from '@/utils';
import { useAuthStore } from '@/stores/auth-store';
import { CurstomerTD, StatusBadge } from '@/components/customerUI';
interface ExtendedPayinOrder extends PayinOrder {
  selected?: boolean;
}

const mapOrderStatusToButtonStatus = (status: PayinOrderStatus | undefined): StatusType => {
  switch (status) {
    case PayinOrderStatus.Pending:
      return 'pending';
    case PayinOrderStatus.Collecting:
      return 'processing';
    case PayinOrderStatus.Confirming:
      return 'success';
    case PayinOrderStatus.CollectFailed:
      return 'failed';
    case PayinOrderStatus.Depositing:
      return 'warning';
    default:
      return 'pending';
  }
};

export const CollectionDataTable = () => {
  const { payinOrders } = useOrderData();
  const payinOrderStatusStore = usePayinOrderStatusStore();
  const { chainConfigs } = useChainConfigStore();

  // Function to get decimal value based on chain and token_id
  const getTokenDecimal = (chain: string, tokenId: string): number => {
    const curChain = chainConfigs.find((config) => config.chain === chain);

    if (!curChain) {
      console.warn(`Chain config not found for chain: ${chain}`);
      return 6; // fallback to default decimal
    }

    const token = curChain?.tokens?.find(
      (token) =>
        token.name === tokenId || token?.name?.includes(tokenId) || tokenId.includes(token.name)
    );

    if (!token) {
      // console.warn(`Token not found for chain: ${chain}, token_id: ${tokenId}`);
      return 6; // fallback to default decimal
    }

    return token.decimal;
  };
  const [addresses, setAddresses] = useState<ExtendedPayinOrder[]>(() =>
    Array.from(payinOrders.values()).map((order: PayinOrder) => ({
      ...order,
      selected: false,
    }))
  );

  useEffect(() => {
    setAddresses((prevAddresses) => {
      const newOrders = Array.from(payinOrders.values());
      const newAddresses = newOrders.map((order) => {
        const existingAddress = prevAddresses.find(
          (prev) =>
            prev.address === order.address &&
            prev.block_ms === order.block_ms &&
            prev.usdt === order.usdt
        );
        return {
          ...order,
          selected: existingAddress?.selected || false,
        };
      });
      return newAddresses;
    });
  }, [payinOrders]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedPageSize, setSelectedPageSize] = useState('10');

  const totalItems = addresses.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = addresses.slice(startIndex, endIndex);
  const handlePageSizeChange = (value: string) => {
    setSelectedPageSize(value);
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[900px] md:min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">User ID</th>
              <th className="px-4 py-3 text-left font-medium">Address</th>
              <th className="px-4 py-3 text-left font-medium">TRX</th>
              <th className="px-4 py-3 text-left font-medium">USDT</th>
              <th className="px-4 py-3 text-left font-medium">Create Time</th>
              <th className="px-4 py-3 text-left font-medium">Remark</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {currentPageData.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8">
                  <NoData message="No Data" />
                </td>
              </tr>
            ) : (
              currentPageData.map((item) => {
                return (
                  <tr
                    key={`${item.address}${item.created_at}${item.usdt}`}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <TRC20AddressDisplay
                        address={item.user_id}
                        showCopyButton={false}
                        copyButtonSize="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <TRC20AddressDisplay
                        address={item.address}
                        showCopyButton={true}
                        copyButtonSize="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(
                        Number(item.value) / Math.pow(10, getTokenDecimal(item.chain, 'trx'))
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(
                        Number(item.usdt) / Math.pow(10, getTokenDecimal(item.chain, 'usdt'))
                      )}
                    </td>
                    <td className="px-4 py-3">{new Date(item.block_ms).toLocaleString()}</td>
                    <td className="px-4 py-3">{item.remark || ''}</td>

                    <CurstomerTD>
                      <StatusBadge
                        status={
                          payinOrderStatusStore.getOrderStatus(
                            `${item.address}${item.created_at}`
                          ) || 'Pending'
                        }
                      >
                        {payinOrderStatusStore.getOrderStatus(
                          `${item.address}${item.created_at}`
                        ) || 'Pending'}
                      </StatusBadge>
                    </CurstomerTD>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        selectedPageSize={selectedPageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};
