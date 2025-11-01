import { useState, useEffect, useMemo, memo, useCallback, useRef, useDeferredValue } from 'react';
import { TRC20AddressDisplay } from '@/components/ui/address-display';
import { NoData } from '@/components/ui/no-data';
import type { PayinOrder } from '@/types/merchant';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { formatNumber } from '@/utils';
import { CurstomerTD, StatusBadge, ExternalLinkButton, Pagination } from '@/components/customerUI';
import { useOrderStore } from '@/stores/order-store';
import { useTokenDecimal } from '@/hooks/use-token-decimal';
import { useShallow } from 'zustand/react/shallow';
import BigNumber from 'bignumber.js';

interface ExtendedPayinOrder extends PayinOrder {
  selected?: boolean;
  formattedTrx?: string;
  formattedUsdt?: string;
}

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

function useOptimizedCollectionData(
  payinOrders: Map<string, PayinOrder>,
  trxDecimal: number,
  usdtDecimal: number
) {
  const [addresses, setAddresses] = useState<ExtendedPayinOrder[]>([]);
  const lastOrdersRef = useRef<Map<string, PayinOrder>>(new Map());

  const deferredOrders = useDeferredValue(payinOrders);

  const debouncedOrders = useDebounce(deferredOrders, 1000);

  const updateAddresses = useCallback(() => {
    const currentOrders = debouncedOrders;
    const lastOrders = lastOrdersRef.current;

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

    const newAddresses: ExtendedPayinOrder[] = [];

    for (const [, order] of currentOrders) {
      newAddresses.push({
        ...order,
        selected: false,
        formattedTrx: formatNumber(
          BigNumber(order.value).div(BigNumber(10).pow(trxDecimal)).toString()
        ),
        formattedUsdt: formatNumber(
          BigNumber(order.usdt).div(BigNumber(10).pow(usdtDecimal)).toString()
        ),
      });
    }

    setAddresses(newAddresses);
    lastOrdersRef.current = new Map(currentOrders);
  }, [debouncedOrders, trxDecimal, usdtDecimal]);

  useEffect(() => {
    updateAddresses();
  }, [updateAddresses]);

  return addresses;
}

const CollectionDataTableComponent = () => {
  const payinOrders = useOrderStore(useShallow((state) => state.payinOrders));
  const payinOrdersStatus = usePayinOrderStatusStore((state) => state.payinOrdersStatus);
  const { trxDecimal, usdtDecimal } = useTokenDecimal();

  const addresses = useOptimizedCollectionData(payinOrders, trxDecimal, usdtDecimal);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const TableRow = memo(
    ({
      item,
      payinOrdersStatus,
    }: {
      item: ExtendedPayinOrder;
      payinOrdersStatus: Map<string, string>;
    }) => {
      const { address, created_at, formattedTrx, formattedUsdt, block_ms, remark, user_id } = item;

      const status = payinOrdersStatus.get(address) || 'Pending';

      return (
        <tr key={`${address}${created_at}`} className="border-t hover:bg-gray-50">
          <td className="px-4 py-3">{user_id}</td>
          <td className="px-4 py-3">
            <ExternalLinkButton hash={address}>
              <TRC20AddressDisplay address={address} />
            </ExternalLinkButton>
          </td>
          <td className="px-4 py-3">{formattedTrx}</td>
          <td className="px-4 py-3">{formattedUsdt}</td>
          <td className="px-4 py-3">{new Date(block_ms).toLocaleString()}</td>
          <td className="px-4 py-3">{remark}</td>
          <CurstomerTD className="min-w-[100px]">
            <StatusBadge status={status}>{status}</StatusBadge>
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
                <td colSpan={7} className="px-4 py-8">
                  <NoData message="No Data" />
                </td>
              </tr>
            ) : (
              currentPageData.map((item) => (
                <TableRow
                  key={`${item.address}${item.created_at}${item.usdt}`}
                  item={item}
                  payinOrdersStatus={payinOrdersStatus}
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
};

CollectionDataTableComponent.displayName = 'CollectionDataTable';

export const CollectionDataTable = memo(CollectionDataTableComponent);
