import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionHistoryTable } from './collection-history-table';
import { useMerchantStore } from '@/stores';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { IconRefresh } from '@tabler/icons-react';
import { Pagination } from '@/components/customerUI/pagination';
import { multiChainConfig } from '@/config/constants';

interface CollectionHistoryProps {
  title?: string;
  description?: string;
  initialPageNumber?: number;
  initialPageSize?: number;
}

export function CollectionHistory({
  title = 'Recent 24 hours have been aggregated into history.',
  initialPageNumber = 1,
  initialPageSize = 10,
}: CollectionHistoryProps) {
  const { error, queryCollectionHistory, collectionHistory } = useMerchantStore();
  const { cur_chain } = useAuthStore();

  // Use a unified loading state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPageNumber);
  const [currentPageSize, setCurrentPageSize] = useState(initialPageSize);

  // Use useCallback to optimize functions
  const loadData = useCallback(async () => {
    try {
      await queryCollectionHistory({
        page_number: currentPage,
        page_size: currentPageSize,
        filters: {
          chain: cur_chain.chain,
          status: 'completed',
        },
      });
    } catch (error) {
      console.error('Failed to load collection history:', error);
    }
  }, [queryCollectionHistory, currentPage, currentPageSize, cur_chain.chain]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData().finally(() => {
      setIsRefreshing(false);
    });
  }, [loadData]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setCurrentPageSize(pageSize);
    setCurrentPage(1); // Reset to first page
  }, []);

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
        >
          <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <CollectionHistoryTable
          historyData={collectionHistory?.list || []}
          scanUrl={
            multiChainConfig.find((config) => config.chain === collectionHistory?.chain)
              ?.scan_url || ''
          }
        />
        {collectionHistory?.total_records && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalItems={collectionHistory.total_records}
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
