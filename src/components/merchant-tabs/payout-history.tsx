import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayoutHistoryTable } from './payout-history-table';
import { Button } from '@/components/ui/button';
import { IconRefresh } from '@tabler/icons-react';
import { useAuthStore } from '@/stores';
import { Pagination } from '@/components/customerUI';
import { queryPayoutHistory } from '@/services/ws/api';
import type { PayoutHistoryResponse } from '@/services/ws/type';
import { multiChainConfig } from '@/config/constants';
interface PayoutHistoryProps {
  title?: string;
  description?: string;
  initialPageNumber?: number;
  initialPageSize?: number;
}

export function PayoutHistory({
  title = 'Recent 24 hours have been aggregated into payout history.',
  initialPageNumber = 1,
  initialPageSize = 10,
}: PayoutHistoryProps) {
  const { cur_chain } = useAuthStore();

  const [data, setData] = useState<PayoutHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPageNumber);
  const [currentPageSize, setCurrentPageSize] = useState(initialPageSize);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryPayoutHistory({
        page_number: currentPage,
        page_size: currentPageSize,
        filters: {
          chain: cur_chain.chain,
          status: 'completed',
        },
      });

      setData(response.data || null);
    } catch (error) {
      console.error('Failed to load payout history:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentPageSize, cur_chain.chain]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setCurrentPageSize(pageSize);
    setCurrentPage(1);
  }, []);

  // Calculate pagination data for customerUI Pagination component
  // removed unused memoized paginationData
  return (
    <Card>
      <CardHeader className="flex justify-between items-center px-6">
        <div>
          <CardTitle>{title}</CardTitle>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <PayoutHistoryTable
          payoutHistory={data}
          isLoading={loading}
          scanUrl={multiChainConfig.find((config) => config.chain === data?.chain)?.scan_url || ''}
        />
        {data?.total_records && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={data.total_records}
              pageSize={currentPageSize}
              selectedPageSize={currentPageSize.toString()}
              onPageChange={handlePageChange}
              onPageSizeChange={(value: string) => handlePageSizeChange(Number(value))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
