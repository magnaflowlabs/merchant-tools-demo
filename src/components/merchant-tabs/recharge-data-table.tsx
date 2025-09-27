import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useOrderData } from '@/hooks/use-order-data';
import { Checkbox } from '@/components/ui/checkbox';
import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { NoData } from '@/components/ui/no-data';
import type { PayinOrder } from '@/types/merchant';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { Pagination } from '@/components/customerUI/pagination';
import { formatNumber } from '@/utils';
import { CurstomerTD, StatusBadge } from '@/components/customerUI';

interface ExtendedPayinOrder extends PayinOrder {
  selected?: boolean;
}

export interface CollectionDataTableRef {
  getSelectedItems: () => ExtendedPayinOrder[];
  getAllData: () => ExtendedPayinOrder[];
  hasData: () => boolean;
}
interface CollectionDataTableProps {
  onSelectionChange?: (selectedCount: number, totalCount: number) => void;
}
export const RechargeDataTable = forwardRef<CollectionDataTableRef, CollectionDataTableProps>(
  (props, ref) => {
    const { rechargeOrders } = useOrderData();
    const payinOrderStatusStore = usePayinOrderStatusStore();

    const [addresses, setAddresses] = useState<ExtendedPayinOrder[]>(() =>
      Array.from(rechargeOrders.values()).map((order: PayinOrder) => ({
        ...order,
        selected: false,
      }))
    );

    useImperativeHandle(
      ref,
      () => ({
        getSelectedItems: () => addresses.filter((item) => item.selected),
        getAllData: () => addresses,
        hasData: () => addresses.length > 0,
      }),
      [addresses]
    );

    useEffect(() => {
      setAddresses((prevAddresses) => {
        const newOrders = Array.from(rechargeOrders.values());
        const newAddresses = newOrders.map((order) => {
          const existingAddress = prevAddresses.find(
            (prev) =>
              prev.address === order.address &&
              prev.created_at === order.created_at &&
              prev.usdt === order.usdt
          );
          return {
            ...order,
            selected: existingAddress?.selected || false,
          };
        });
        return newAddresses;
      });
    }, [rechargeOrders]);

    useEffect(() => {
      const selectedCount = addresses.filter((item) => item.selected).length;
      const totalCount = addresses.length;
      props.onSelectionChange?.(selectedCount, totalCount);
    }, [addresses, props.onSelectionChange]);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedPageSize, setSelectedPageSize] = useState('10');

    const totalItems = addresses.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = addresses.slice(startIndex, endIndex);

    const handleSelectAll = (checked: boolean) => {
      setAddresses((prev) =>
        prev.map((item, index) => {
          if (index >= startIndex && index < endIndex) {
            return { ...item, selected: checked };
          }
          return item;
        })
      );
    };

    const handleSelectItem = (address: string, checked: boolean) => {
      setAddresses((prev) =>
        prev.map((item) => (item.address === address ? { ...item, selected: checked } : item))
      );
    };

    const isCurrentPageAllSelected =
      currentPageData.length > 0 && currentPageData.every((item) => item.selected);
    const isCurrentPageIndeterminate =
      currentPageData.some((item) => item.selected) && !isCurrentPageAllSelected;

    const handlePageSizeChange = (value: string) => {
      setSelectedPageSize(value);
      setPageSize(Number(value));
      setCurrentPage(1);
    };

    const goToPage = (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    };

    return (
      <div className="space-y-4">
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[900px] md:min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={isCurrentPageAllSelected}
                    onCheckedChange={handleSelectAll}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLInputElement).indeterminate = isCurrentPageIndeterminate;
                      }
                    }}
                  />
                </th>
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
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(checked) =>
                            handleSelectItem(item.address, checked as boolean)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">{item.user_id || ''}</td>
                      <td className="px-4 py-3">
                        <TRC20AddressDisplay
                          address={item.address}
                          showCopyButton={true}
                          copyButtonSize="sm"
                        />
                      </td>
                      <td className="px-4 py-3">{formatNumber(Number(item.value) / 1e6)}</td>
                      <td className="px-4 py-3">{formatNumber(Number(item.usdt) / 1e6)}</td>
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
          onPageChange={goToPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    );
  }
);
