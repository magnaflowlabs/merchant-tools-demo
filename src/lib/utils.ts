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

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function delay_fn(ms?: number): Promise<void> {
  const delayMs =
    typeof ms === 'number' && Number.isFinite(ms)
      ? ms
      : Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
