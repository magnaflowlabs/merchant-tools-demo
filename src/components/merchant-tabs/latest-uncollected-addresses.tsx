import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionDataTable } from './collection-data-table';

export function LatestUncollectedAddresses({}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Pending Collection Addresses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CollectionDataTable />
      </CardContent>
    </Card>
  );
}
