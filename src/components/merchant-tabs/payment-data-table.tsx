import { useState, useEffect, useCallback, forwardRef, useMemo, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { PayoutOrderStatus } from '@/stores/order-store';
import { NoData } from '@/components/ui/no-data';
import { StatusBadge } from '@/components/customerUI';
import { TRC20AddressDisplay, AddressDisplay } from '@/components/ui/address-display';
import { useOrderStore, type ExtendedPayoutOrder } from '@/stores/order-store';
import { useSelectionStore } from '@/stores/selection-store';
import { useShallow } from 'zustand/react/shallow';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { usePrivateKeyConnection } from '@/hooks/use-private-key-connection';
import { useMerchantStore } from '@/stores/merchant-store';
import { CurstomerTD, ExternalLinkButton, Pagination } from '@/components/customerUI';

interface PaymentDataTableProps {
  onSelectionChange?: (selectedIds: string[]) => void;
}

export interface PaymentDataTableRef {
  batchPayOut: (
    addresses: string[],
    usdtList: number[]
  ) => Promise<{ success: boolean; message: string }>;
}

export const PaymentDataTable = forwardRef<PaymentDataTableRef, PaymentDataTableProps>(
  ({ onSelectionChange }, _ref) => {
    const payoutOrdersStatusManager = useOrderStore(
      useShallow((state) => state.payoutOrdersStatusManager)
    );

    const {
      setPayoutSelected,
      setPayoutSelectedMany,
      selectedPayoutOrders,
      isPayoutOrderSelected,
    } = useSelectionStore(
      useShallow((state) => ({
        setPayoutSelected: state.setPayoutSelected,
        setPayoutSelectedMany: state.setPayoutSelectedMany,
        selectedPayoutOrders: state.selectedPayoutOrders,
        isPayoutOrderSelected: state.isPayoutOrderSelected,
      }))
    );
    const { connected } = useWallet();
    const { isConnected: privateKeyConnected } = usePrivateKeyConnection();
    const { isAutoPaying } = useMerchantStore(
      useShallow((state) => ({
        isAutoPaying: state.isAutoPaying,
      }))
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const payoutOrdersStats = useOrderStore((state) => state.payoutOrdersStats);

    const { totalItems, totalPages } = useMemo(() => {
      return {
        totalItems: payoutOrdersStats.totalCount,
        totalPages: Math.ceil(payoutOrdersStats.totalCount / pageSize),
      };
    }, [payoutOrdersStats.totalCount, pageSize]);

    const prevTotalItemsRef = useRef(0);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
      // Case 1: Data goes from empty to having data (first load)
      if (prevTotalItemsRef.current === 0 && totalItems > 0) {
        setRefreshKey((prev) => prev + 1);
      }
      // Case 2: Data quantity changes (add/delete orders, or status changes causing show/hide)
      else if (prevTotalItemsRef.current !== totalItems) {
        setRefreshKey((prev) => prev + 1);
      }
      prevTotalItemsRef.current = totalItems;
    }, [totalItems]);

    useEffect(() => {
      setRefreshKey((prev) => prev + 1);
    }, [payoutOrdersStatusManager]);

    const currentPageData = useMemo(() => {
      const store = useOrderStore.getState();
      const allOrders = store.payoutOrders;

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData: ExtendedPayoutOrder[] = [];

      let count = 0;
      for (const order of allOrders.valuesInOrder()) {
        // if (order.status === PayoutOrderStatus.Success) {
        //   continue;
        // }

        if (count >= startIndex && count < endIndex) {
          pageData.push(order);
        }

        count++;

        if (pageData.length >= pageSize) {
          break;
        }
      }
      return pageData;
    }, [currentPage, pageSize, refreshKey]);

    const getSelectedPayoutOrders = useCallback(() => {
      const store = useOrderStore.getState();
      const selectedOrders: ExtendedPayoutOrder[] = [];

      for (const bill_no of selectedPayoutOrders) {
        const order = store.payoutOrders.get(bill_no);
        if (order && order.status !== PayoutOrderStatus.Confirming) {
          selectedOrders.push(order);
        }
      }

      return selectedOrders;
    }, [selectedPayoutOrders]);

    const getSelectedIds = useCallback(() => {
      return getSelectedPayoutOrders().map((order) => order.bill_no);
    }, [getSelectedPayoutOrders]);

    useEffect(() => {
      if (onSelectionChange) {
        const selectedIds = getSelectedIds();
        onSelectionChange(selectedIds);
      }
    }, [getSelectedIds, onSelectionChange, selectedPayoutOrders]);

    const handleSelectAll = useCallback(
      (checked: boolean) => {
        const item_bill_nos = currentPageData
          .filter(
            (item) =>
              payoutOrdersStatusManager.get(item.bill_no)?.status != PayoutOrderStatus.Confirming &&
              payoutOrdersStatusManager.get(item.bill_no)?.status != PayoutOrderStatus.Locked
          )
          .map((item) => item.bill_no);
        setPayoutSelectedMany(item_bill_nos, checked);
      },
      [currentPageData, payoutOrdersStatusManager, setPayoutSelectedMany]
    );

    const handleSelectItem = useCallback(
      (id: string, checked: boolean) => {
        const order = currentPageData.find((item) => item.bill_no === id);
        if (
          order &&
          payoutOrdersStatusManager.get(order.bill_no)?.status === PayoutOrderStatus.Confirming
        ) {
          return;
        }

        setPayoutSelected(id, checked);
      },
      [currentPageData, payoutOrdersStatusManager, setPayoutSelected]
    );

    const isCurrentPageAllSelected = useMemo(() => {
      const selectable = currentPageData.filter(
        (item) =>
          payoutOrdersStatusManager.get(item.bill_no)?.status !== PayoutOrderStatus.Confirming &&
          payoutOrdersStatusManager.get(item.bill_no)?.status !== PayoutOrderStatus.Locked
      );

      if (selectable.length === 0) {
        return false;
      }

      return selectable.every((item) => isPayoutOrderSelected(item.bill_no));
    }, [currentPageData, payoutOrdersStatusManager, isPayoutOrderSelected, selectedPayoutOrders]);

    const handlePageSizeChange = useCallback((value: number) => {
      setPageSize(value);
      setCurrentPage(1);
    }, []);

    const goToPage = useCallback(
      (page: number) => {
        if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
        }
      },
      [totalPages]
    );

    return (
      <div className="space-y-4">
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full min-w-max whitespace-nowrap">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={isCurrentPageAllSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={isAutoPaying || !(privateKeyConnected || connected)}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLInputElement).indeterminate = false;
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Bill No</th>
                <th className="px-4 py-3 text-left font-medium">Address</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Remark</th>
                <th className="px-4 py-3 text-left font-medium min-w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(currentPageData) && currentPageData.length > 0 ? (
                currentPageData.map((item) => {
                  const isSelected = isPayoutOrderSelected(item.bill_no);

                  return (
                    <tr key={item.bill_no} className="border-t hover:bg-gray-50">
                      <CurstomerTD className="font-medium">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectItem(item.bill_no, checked as boolean)
                          }
                          disabled={
                            isAutoPaying ||
                            payoutOrdersStatusManager.get(item.bill_no)?.status ==
                              PayoutOrderStatus.Locked ||
                            payoutOrdersStatusManager.get(item.bill_no)?.status ===
                              PayoutOrderStatus.Confirming ||
                            !(privateKeyConnected || connected)
                          }
                        />
                      </CurstomerTD>
                      <CurstomerTD className="font-medium">
                        <AddressDisplay
                          address={item.bill_no}
                          showCopyButton={false}
                          addressLength={100}
                          showTooltip={false}
                        />
                      </CurstomerTD>

                      <CurstomerTD className="font-medium">
                        <ExternalLinkButton hash={item.to}>
                          <TRC20AddressDisplay address={item.to} />
                        </ExternalLinkButton>
                      </CurstomerTD>

                      <CurstomerTD className="font-medium">{`${item.amount} ${item?.token?.toUpperCase()}`}</CurstomerTD>
                      <CurstomerTD className="font-medium">
                        {item.created_at
                          ? new Date(parseInt(item.created_at)).toLocaleString()
                          : ''}
                      </CurstomerTD>
                      <CurstomerTD className="font-medium">{item.remark}</CurstomerTD>
                      <CurstomerTD className="font-medium min-w-[100px]">
                        <StatusBadge
                          status={
                            payoutOrdersStatusManager.get(item.bill_no)?.status || item.status
                          }
                        />
                      </CurstomerTD>
                    </tr>
                  );
                })
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
          onPageChange={goToPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    );
  }
);
