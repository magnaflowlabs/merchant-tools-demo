import { Card, CardContent, CardTitle } from '@/components/ui/card';

export interface StatCardProps {
  title: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

export function StatCard({ title, value, color }: StatCardProps) {
  const getColorClasses = (colorName: string) => ({
    bg: `bg-gradient-to-br from-${colorName}-50 to-${colorName}-100 border-${colorName}-200`,
    dot: `bg-${colorName}-500`,
    title: `text-${colorName}-700`,
    value: `text-${colorName}-900`,
  });

  const classes = getColorClasses(color);

  return (
    <Card
      className={`relative overflow-hidden ${classes.bg} hover:shadow-lg transition-all duration-300 py-4`}
    >
      <CardContent className="px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 ${classes.dot} rounded-full`}></div>
            <CardTitle className={`text-base font-medium ${classes.title}`}>{title}</CardTitle>
          </div>
          <div className={`text-3xl font-bold ${classes.value}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
