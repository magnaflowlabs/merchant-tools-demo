import { useChainConfigStore } from '@/stores/chain-config-store';
import { useAuthStore } from '@/stores/auth-store';
import BigNumber from 'bignumber.js';
export function formatNumber(num: number | string, decimalPlaces: number = 4): string {
  const [integer, dec = ''] = BigNumber(num).toString().split('.');
  const formattedInt = Number(integer).toLocaleString('en-US');
  const decimal = dec.padEnd(2, '0').slice(0, decimalPlaces);
  return `${formattedInt}.${decimal}`;
}
export const formatNumberDev = (
  value: number | string | bigint,
  decimals: number,
  options: {
    thousandsSep?: string;
    decimalSep?: string;
    fixed?: number; // if set, pad/truncate to this many decimal places
    trimTrailingZeros?: boolean; // default true when fixed not provided
  } = {}
): string => {
  const thousandsSep = options.thousandsSep ?? ',';
  const decimalSep = options.decimalSep ?? '.';
  const fixed = options.fixed;
  const trimTrailingZeros = options.trimTrailingZeros ?? fixed === undefined;

  if (value === null || value === undefined) return '0';

  // normalize to integer string (assume smallest units)
  let isNegative = false;
  let digits: string;

  if (typeof value === 'bigint') {
    isNegative = value < 0n;
    const absVal = isNegative ? -value : value;
    digits = absVal.toString();
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || isNaN(value)) return '0';
    isNegative = value < 0;
    const absVal = Math.trunc(Math.abs(value));
    digits = String(absVal);
  } else {
    // string input; allow optional leading minus and digits only
    const str = value.trim();
    if (!/^[-]?\d+$/.test(str)) {
      // fallback: try number coercion
      const n = Number(str);
      if (!Number.isFinite(n) || isNaN(n)) return '0';
      isNegative = n < 0;
      digits = String(Math.trunc(Math.abs(n)));
    } else {
      isNegative = str.startsWith('-');
      digits = (isNegative ? str.slice(1) : str) || '0';
    }
  }

  // scale split
  if (decimals <= 0) {
    let intPart = digits;
    if (thousandsSep) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
    return (isNegative ? '-' : '') + intPart;
  }

  // ensure digits has enough length for decimals
  const padded = digits.padStart(decimals + 1, '0');
  const splitIndex = padded.length - decimals;
  let intPart = padded.slice(0, splitIndex);
  let fracPart = padded.slice(splitIndex);

  // thousands formatting for integer part
  if (thousandsSep) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

  // apply fixed/trimming rules
  if (fixed !== undefined) {
    if (fixed <= 0) {
      return (isNegative ? '-' : '') + intPart;
    }
    if (fracPart.length > fixed) {
      fracPart = fracPart.slice(0, fixed);
    } else if (fracPart.length < fixed) {
      fracPart = fracPart.padEnd(fixed, '0');
    }
  } else if (trimTrailingZeros) {
    fracPart = fracPart.replace(/0+$/, '');
  }

  return fracPart.length > 0
    ? (isNegative ? '-' : '') + intPart + decimalSep + fracPart
    : (isNegative ? '-' : '') + intPart;
};
export const getDecimal = (tokenName: string) => {
  // Avoid React Hooks inside utility, use Zustand getState() instead
  const { chainConfigs } = useChainConfigStore.getState();
  const { cur_chain } = useAuthStore.getState();

  const curChain = chainConfigs.find((config) => config.chain === cur_chain?.chain);

  if (curChain && curChain.tokens) {
    const token = curChain.tokens?.find(
      (token) => token.name === tokenName || token.symbol === tokenName
    );
    if (token) {
      return token.decimal;
    }
  }
};
