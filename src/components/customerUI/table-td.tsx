import React from 'react';
import { cn } from '@/lib/utils';

export interface CustomerTDProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export function CurstomerTD({ className, style, children, ...rest }: CustomerTDProps) {
  const baseClasses = 'px-4 py-3 text-left text-sm ';

  return (
    <td className={cn(baseClasses, className)} style={style} {...rest}>
      {children}
    </td>
  );
}

export default CurstomerTD;
