import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  memo,
  useCallback,
  useRef,
  useDeferredValue,
} from 'react';
import { useOrderStore } from '@/stores/order-store';
import { Checkbox } from '@/components/ui/checkbox';
import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { NoData } from '@/components/ui/no-data';
import type { PayinOrder } from '@/types/merchant';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { Pagination } from '@/components/customerUI/pagination';
import { formatNumber } from '@/utils';
import { useMerchantStore } from '@/stores/merchant-store';
import { useShallow } from 'zustand/react/shallow';
import { PayinOrderStatus } from '@/types/merchant';
import { CurstomerTD, StatusBadge, ExternalLinkButton } from '@/components/customerUI';

interface ExtendedPayinOrder extends PayinOrder {
  selected?: boolean;
}

export interface CollectionDataTableRef {
  getSelectedItems: () => ExtendedPayinOrder[];
  getAllData: () => ExtendedPayinOrder[];
  hasData: () => boolean;
  clearSelection: () => void;
}

interface CollectionDataTableProps {
  onSelectionChange?: (selectedCount: number, totalCount: number) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Optimized data transformation hook
function useOptimizedRechargeData(rechargeOrders: Map<string, PayinOrder>) {
  const [addresses, setAddresses] = useState<ExtendedPayinOrder[]>([]);
  const [selectionMap, setSelectionMap] = useState<Map<string, boolean>>(new Map());
  const lastOrdersRef = useRef<Map<string, PayinOrder>>(new Map());

  // Use useDeferredValue to defer non-urgent updates
  const deferredOrders = useDeferredValue(rechargeOrders);

  // Debounce handling for large data updates
  const debouncedOrders = useDebounce(deferredOrders, 800);

  const updateAddresses = useCallback(() => {
    const currentOrders = debouncedOrders;
    const lastOrders = lastOrdersRef.current;

    // Check if there are actual changes
    if (currentOrders.size === lastOrders.size) {
      let hasChanges = false;
      for (const [key, order] of currentOrders) {
        const lastOrder = lastOrders.get(key);
        if (
          !lastOrder ||
          lastOrder.usdt !== order.usdt ||
          lastOrder.value !== order.value ||
          lastOrder.block_ms !== order.block_ms
        ) {
          hasChanges = true;
          break;
        }
      }
      if (!hasChanges) return;
    }

    // Incremental update: only process changed data
    const newAddresses: ExtendedPayinOrder[] = [];
    const newSelectionMap = new Map(selectionMap);

    for (const [key, order] of currentOrders) {
      const existingSelection = selectionMap.get(key) || false;
      newAddresses.push({
        ...order,
        selected: existingSelection,
      });
    }

    // Clean up non-existent selection states
    for (const key of selectionMap.keys()) {
      if (!currentOrders.has(key)) {
        newSelectionMap.delete(key);
      }
    }

    setAddresses(newAddresses);
    setSelectionMap(newSelectionMap);
    lastOrdersRef.current = new Map(currentOrders);
  }, [debouncedOrders, selectionMap]);

  useEffect(() => {
    updateAddresses();
  }, [updateAddresses]);

  const updateSelection = useCallback((address: string, selected: boolean) => {
    setSelectionMap((prev) => {
      const newMap = new Map(prev);
      if (selected) {
        newMap.set(address, true);
      } else {
        newMap.delete(address);
      }
      return newMap;
    });

    setAddresses((prev) =>
      prev.map((item) => (item.address === address ? { ...item, selected } : item))
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionMap(new Map());
    setAddresses((prev) => prev.map((item) => ({ ...item, selected: false })));
  }, []);

  return {
    addresses,
    updateSelection,
    clearSelection,
  };
}
const RechargeDataTableComponent = forwardRef<CollectionDataTableRef, CollectionDataTableProps>(
  (props, ref) => {
    // Use useShallow to optimize Zustand store subscription, only re-render when Map content actually changes
    const rechargeOrders = useOrderStore(useShallow((state) => state.rechargeOrders));
    const getOrderStatus = usePayinOrderStatusStore((state) => state.getOrderStatus);
    const isAutoTopping = useMerchantStore((state) => state.isAutoTopping);

    // Use optimized data processing hook
    const { addresses, updateSelection, clearSelection } = useOptimizedRechargeData(rechargeOrders);

    useImperativeHandle(
      ref,
      () => ({
        getSelectedItems: () => addresses.filter((item) => item.selected),
        getAllData: () => addresses,
        hasData: () => addresses.length > 0,
        clearSelection,
      }),
      [addresses, clearSelection]
    );

    useEffect(() => {
      if (isAutoTopping) {
        return;
      }
      const selectedCount = addresses.filter((item) => item.selected).length;
      const totalCount = addresses.length;
      props.onSelectionChange?.(selectedCount, totalCount);
    }, [addresses, props.onSelectionChange, isAutoTopping]);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Optimize pagination calculation using useMemo and more granular dependencies
    const paginationData = useMemo(() => {
      const totalItems = addresses.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      return {
        totalItems,
        totalPages,
        startIndex,
        endIndex,
      };
    }, [addresses.length, pageSize, currentPage]);

    // Calculate current page data separately to avoid unnecessary recalculation
    const currentPageData = useMemo(() => {
      const { startIndex, endIndex } = paginationData;
      return addresses.slice(startIndex, endIndex);
    }, [addresses, paginationData]);

    const { totalItems, totalPages } = paginationData;

    useEffect(() => {
      if (totalPages > 0 && currentPage > totalPages) {
        setCurrentPage(totalPages);
      } else if (totalPages === 0 && currentPage !== 1) {
        setCurrentPage(1);
      }
    }, [totalPages, currentPage]);

    const handleSelectAll = useCallback(
      (checked: boolean) => {
        // Batch update selection state for current page
        currentPageData.forEach((item) => {
          const orderStatus = getOrderStatus(item.address);
          if (orderStatus === PayinOrderStatus.Pending) {
            updateSelection(item.address, checked);
          }
        });
      },
      [currentPageData, getOrderStatus, updateSelection]
    );

    const handleSelectItem = useCallback(
      (address: string, checked: boolean) => {
        updateSelection(address, checked);
      },
      [updateSelection]
    );

    const isCurrentPageAllSelected = useMemo(
      () => currentPageData.length > 0 && currentPageData.some((item) => item.selected),
      [currentPageData]
    );

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

    // Optimized table row component using memo to avoid unnecessary re-renders
    const TableRow = memo(
      ({
        item,
        onSelectItem,
        isAutoTopping,
      }: {
        item: ExtendedPayinOrder;
        onSelectItem: (address: string, checked: boolean) => void;
        isAutoTopping: boolean;
      }) => {
        const orderStatus = getOrderStatus(item.address);
        const displayStatus = orderStatus || 'Pending';

        return (
          <tr key={item.address} className="border-t hover:bg-gray-50">
            <td className="px-4 py-3">
              <Checkbox
                checked={item.selected && orderStatus !== PayinOrderStatus.Confirming}
                onCheckedChange={(checked) => onSelectItem(item.address, checked as boolean)}
                disabled={orderStatus != 'Pending' || isAutoTopping}
              />
            </td>
            <td className="px-4 py-3">{item.user_id || ''}</td>
            <td className="px-4 py-3">
              <ExternalLinkButton hash={item.address}>
                <TRC20AddressDisplay address={item.address} />
              </ExternalLinkButton>
            </td>
            <td className="px-4 py-3">{formatNumber(Number(item.value) / 1e6)}</td>
            <td className="px-4 py-3">{formatNumber(Number(item.usdt) / 1e6)}</td>
            <td className="px-4 py-3">{new Date(item.block_ms).toLocaleString()}</td>
            <td className="px-4 py-3">{item.remark || ''}</td>
            <CurstomerTD className="min-w-[100px]">
              <StatusBadge status={displayStatus}>{displayStatus}</StatusBadge>
            </CurstomerTD>
          </tr>
        );
      }
    );

    return (
      <div className="space-y-4">
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full min-w-max whitespace-nowrap">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    disabled={isAutoTopping}
                    checked={isCurrentPageAllSelected}
                    onCheckedChange={handleSelectAll}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLInputElement).indeterminate = false;
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">User ID</th>
                <th className="px-4 py-3 text-left font-medium">Address</th>
                <th className="px-4 py-3 text-left font-medium">TRX</th>
                <th className="px-4 py-3 text-left font-medium">USDT</th>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Remark</th>
                <th className="px-4 py-3 text-left font-medium min-w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentPageData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8">
                    <NoData message="No Data" />
                  </td>
                </tr>
              ) : (
                currentPageData.map((item) => (
                  <TableRow
                    key={item.address}
                    item={item}
                    onSelectItem={handleSelectItem}
                    isAutoTopping={isAutoTopping}
                  />
                ))
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

RechargeDataTableComponent.displayName = 'RechargeDataTable';

export const RechargeDataTable = memo(RechargeDataTableComponent);
