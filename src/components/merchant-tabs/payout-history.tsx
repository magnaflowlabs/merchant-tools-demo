import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayoutHistoryTable } from './payout-history-table';
import { Button } from '@/components/ui/button';
import { IconRefresh } from '@tabler/icons-react';
import { Pagination } from '@/components/customerUI';
import { queryPayoutHistory } from '@/services/ws/api';
import type { PayoutHistoryResponse } from '@/services/ws/type';
import { useOrderStore } from '@/stores/order-store';
import { useChainConfigStore } from '@/stores/chain-config-store';

export function PayoutHistory() {
  // Get current chain from chain config store
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);
  const hasCompletedOrders = useOrderStore((state) => state.hasCompletedOrders);
  const setHasCompletedOrders = useOrderStore((state) => state.setHasCompletedOrders);
  const [data, setData] = useState<PayoutHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const getPayoutHistory = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const response = await queryPayoutHistory({
        page_number: currentPage,
        page_size: currentPageSize,
        sort_order: 'desc',
        filters: {
          chain: curChainConfig.chain,
          status: 'completed',
          start_time: twentyFourHoursAgo.toISOString(),
          end_time: now.toISOString(),
        },
      });

      setData(response.data || null);
      setHasCompletedOrders(false);
    } catch (error) {
      console.error('Failed to load payout history:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentPageSize, curChainConfig.chain]);

  useEffect(() => {
    getPayoutHistory();
  }, [getPayoutHistory]);
  useEffect(() => {
    if (hasCompletedOrders) {
      getPayoutHistory();
    }
  }, [hasCompletedOrders]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = (pageSize: number) => {
    setCurrentPageSize(pageSize);
    setCurrentPage(1);
  };

  return (
    <Card>
      <CardHeader className="flex justify-between items-center px-6">
        <CardTitle>24-hour history</CardTitle>
        <Button
          className="flex items-center gap-2"
          onClick={getPayoutHistory}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <PayoutHistoryTable payoutHistory={data} isLoading={loading} />
        {Boolean(data?.total_records) && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={data?.total_records || 0}
              pageSize={currentPageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
