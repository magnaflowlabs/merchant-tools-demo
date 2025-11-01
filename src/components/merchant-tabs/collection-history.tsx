import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionHistoryTable } from './collection-history-table';
import { useMerchantStore, useShallow } from '@/stores';
import { Button } from '@/components/ui/button';
import { IconRefresh } from '@tabler/icons-react';
import { Pagination } from '@/components/customerUI/pagination';
import { useChainConfigStore } from '@/stores/chain-config-store';

export function CollectionHistory() {
  const { queryCollectionHistory, collectionHistory } = useMerchantStore(
    useShallow((state) => ({
      queryCollectionHistory: state.queryCollectionHistory,
      collectionHistory: state.collectionHistory,
    }))
  );

  // Get current chain from chain config store
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);

  // Use a unified loading state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  useEffect(() => {
    if (!curChainConfig.chain) {
      return;
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    queryCollectionHistory({
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
  }, [currentPage, currentPageSize, curChainConfig.chain]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await queryCollectionHistory({
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
    } catch (error) {
      console.error('Failed to refresh collection history:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setCurrentPageSize(pageSize);
    setCurrentPage(1);
  }, []);

  return (
    <Card>
      <CardHeader className="flex justify-between items-center px-6">
        <CardTitle>24-hour history</CardTitle>
        <Button
          className="flex items-center gap-2"
          onClick={handleRefresh}
          variant="outline"
          size="sm"
        >
          <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <CollectionHistoryTable
          historyData={collectionHistory?.list || []}
          isRefreshing={isRefreshing}
        />

        {Boolean(collectionHistory?.total_records) && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={collectionHistory?.total_records ?? 0}
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
