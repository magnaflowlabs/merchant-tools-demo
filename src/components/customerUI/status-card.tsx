import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import BigNumber from 'bignumber.js';

import { useIsMobile } from '@/hooks/use-mobile';
import AnimatedNumber from './AnimatedNumber';

interface StatusCardProps {
  title: string;
  value: number | string;
  isLoading?: boolean;
  color?: 'green' | 'orange' | 'blue' | 'red' | 'gray';
  className?: string;
}

interface AddressUsageCardProps {
  used: number | string | BigNumber;
  unused: number | string | BigNumber;
  isLoading?: boolean;
  className?: string;
}

const colorClasses = {
  green: 'text-green-600',
  orange: 'text-orange-600',
  blue: 'text-blue-600',
  red: 'text-red-600',
  gray: 'text-gray-600',
};

export function StatusCard({
  title,
  value,
  isLoading = false,
  color = 'green',
  className = '',
}: StatusCardProps) {
  return (
    <Card className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base sm:text-lg">{title}：</CardTitle>
        </div>
        <CardDescription
          className={`text-xl sm:text-2xl font-bold break-words ${colorClasses[color]}`}
        >
          {isLoading ? '...' : value}
        </CardDescription>
      </div>
    </Card>
  );
}

export function AddressUsageCard({
  used,
  unused,
  isLoading = false,
  className = '',
}: AddressUsageCardProps) {
  // Convert to BigNumber for precise calculations
  const usedBN = new BigNumber(used);
  const unusedBN = new BigNumber(unused);
  const totalBN = usedBN.plus(unusedBN);

  // Calculate percentages using BigNumber
  const usedPercentage = totalBN.isGreaterThan(0)
    ? usedBN.dividedBy(totalBN).multipliedBy(100).toNumber()
    : 0;
  const unusedPercentage = totalBN.isGreaterThan(0)
    ? unusedBN.dividedBy(totalBN).multipliedBy(100).toNumber()
    : 0;

  // Convert to numbers for display
  const total = totalBN.toNumber();
  const usedNumber = usedBN.toNumber();
  const unusedNumber = unusedBN.toNumber();

  const isMobile = useIsMobile();
  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Address Usage Status</CardTitle>
              <p className="text-xs sm:text-sm text-gray-500">
                Address allocation and usage monitoring
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 leading-tight">
              <AnimatedNumber value={total} duration={0.2} />
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Total Addresses</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-orange-600 font-medium flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              {isMobile
                ? usedNumber.toLocaleString()
                : `Used Addresses: ${usedNumber.toLocaleString()}`}
            </span>

            <span className="text-green-600 font-medium flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {isMobile
                ? unusedNumber.toLocaleString()
                : `Unused Addresses: ${unusedNumber.toLocaleString()}`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden shadow-inner">
            <div className="flex h-full">
              <div
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-full transition-all duration-500 ease-in-out shadow-sm"
                style={{ width: `${usedPercentage}%` }}
              />
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500 ease-in-out shadow-sm"
                style={{ width: `${unusedPercentage}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs text-gray-500">
            <span>{usedPercentage.toFixed(1)}%</span>
            <span>{unusedPercentage.toFixed(1)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
          <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">
              {isLoading ? '...' : usedNumber.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-orange-700 font-medium">Used Addresses</div>
          </div>
          <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {isLoading ? '...' : unusedNumber.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-green-700 font-medium">Unused Addresses</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
