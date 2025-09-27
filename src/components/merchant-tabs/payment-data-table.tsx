import { useState, useEffect, useCallback, forwardRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

import { PayoutOrderStatus } from '@/stores/order-store';
import { NoData } from '@/components/ui/no-data';
import { Pagination } from '@/components/customerUI';
import { StatusButton } from '@/components/ui/status-button';
import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { useOrderStore, type ExtendedPayoutOrder } from '@/stores/order-store';
import { CurstomerTD } from '@/components/customerUI';
interface PaymentDataTableProps {
  onSelectionChange?: (selectedIds: string[]) => void;
}

export interface PaymentDataTableRef {
  batchPayOut: (
    addresses: string[],
    usdtList: number[]
  ) => Promise<{ success: boolean; message: string; txHash?: string }>;
}

export const PaymentDataTable = forwardRef<PaymentDataTableRef, PaymentDataTableProps>(
  ({ onSelectionChange }, _ref) => {
    const {
      payoutOrders,
      setPayoutOrderSelected,
      setPayoutOrdersSelected,
      getSelectedPayoutOrders,
    } = useOrderStore();

    const [paymentData, setPaymentData] = useState<ExtendedPayoutOrder[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedPageSize, setSelectedPageSize] = useState('10');

    useEffect(() => {
      const ordersArray = Array.from(payoutOrders?.values()).reverse();
      const transformedData = ordersArray?.filter(
        (order) => order?.status !== PayoutOrderStatus.Success
      );
      setPaymentData(transformedData);
    }, [payoutOrders]);

    const totalItems = paymentData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = paymentData.slice(startIndex, endIndex);
    const getSelectedIds = useCallback(() => {
      return getSelectedPayoutOrders()
        .filter((order) => order.status !== PayoutOrderStatus.Confirming)
        .map((order) => order.bill_no);
    }, [getSelectedPayoutOrders]);

    useEffect(() => {
      if (onSelectionChange) {
        const selectedIds = getSelectedIds();
        onSelectionChange(selectedIds);
      }
    }, [getSelectedIds, onSelectionChange, payoutOrders]);

    const handleSelectAll = (checked: boolean) => {
      const selectableUuids = currentPageData
        .filter((item) => item.status !== PayoutOrderStatus.Confirming)
        .map((item) => item.bill_no);
      setPayoutOrdersSelected(selectableUuids, checked);
    };

    const handleSelectItem = (id: string, checked: boolean) => {
      const order = currentPageData.find((item) => item.id === id);
      if (order && order.status === PayoutOrderStatus.Confirming) {
        return;
      }

      setPayoutOrderSelected(id, checked);
    };

    const selectableItems = currentPageData.filter(
      (item) => item.status !== PayoutOrderStatus.Confirming
    );
    const isCurrentPageAllSelected =
      selectableItems.length > 0 && selectableItems.every((item) => item.selected);

    const isCurrentPageIndeterminate =
      selectableItems.some((item) => item.selected) && !isCurrentPageAllSelected;

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
                <th className="px-4 py-3 text-left font-medium">Bill No</th>
                <th className="px-4 py-3 text-left font-medium">Address</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Create Time</th>
                <th className="px-4 py-3 text-left font-medium">Note</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(currentPageData) && currentPageData.length > 0 ? (
                currentPageData.map((item) => (
                  <tr key={item.bill_no} className="border-t hover:bg-gray-50">
                    <CurstomerTD className="font-medium">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) =>
                          handleSelectItem(item.bill_no, checked as boolean)
                        }
                        disabled={item.status === PayoutOrderStatus.Confirming}
                      />
                    </CurstomerTD>
                    <CurstomerTD className="font-medium">
                      <TRC20AddressDisplay
                        address={item.bill_no}
                        showCopyButton={false}
                        copyButtonSize="sm"
                      />
                    </CurstomerTD>

                    <CurstomerTD className="font-medium">
                      <TRC20AddressDisplay address={item.to} copyButtonSize="sm" />
                    </CurstomerTD>

                    <CurstomerTD className="font-medium">{`${item.amount} ${item?.token?.toUpperCase()}`}</CurstomerTD>
                    <CurstomerTD className="font-medium">
                      {item.created_at ? new Date(parseInt(item.created_at)).toLocaleString() : ''}
                    </CurstomerTD>
                    <CurstomerTD className="font-medium">{item.remark}</CurstomerTD>
                    <CurstomerTD className="font-medium">
                      <StatusButton
                        status={
                          item.status === PayoutOrderStatus.Pending
                            ? 'pending'
                            : item.status === PayoutOrderStatus.Processing
                              ? 'processing'
                              : item.status === PayoutOrderStatus.Confirming
                                ? 'completed'
                                : 'failed'
                        }
                        size="md"
                        variant="ghost"
                        className="h-auto p-0 font-medium"
                      >
                        {item.status}
                      </StatusButton>
                    </CurstomerTD>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <NoData />
                  </td>
                </tr>
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
