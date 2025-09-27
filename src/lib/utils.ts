import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TronWeb } from 'tronweb';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateFromSun(amount: number, decimalPlaces: number = 2): string {
  const trxStr = TronWeb.fromSun(amount).toString();
  const [integer, dec = ''] = trxStr.split('.');
  const formattedInt = Number(integer).toLocaleString('en-US');
  const decimal = dec.padEnd(2, '0').slice(0, decimalPlaces);
  return `${formattedInt}.${decimal}`;
}
