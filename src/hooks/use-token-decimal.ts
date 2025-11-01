import { useChainConfigStore } from '@/stores/chain-config-store';
import { useCallback, useMemo } from 'react';

/**
 * Hook to get token decimal based on chain and token ID
 * with cache optimization, avoid duplicate lookup, suitable for large data rendering scenarios
 * @returns getTokenDecimal function
 */
export const useTokenDecimal = () => {
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);
  // cache map: "tokenId" -> decimal
  const decimalCache = useMemo(() => {
    const cache = new Map<string, number>();
    curChainConfig.tokens?.forEach((token) => {
      // index by symbol and name (both lowercase) to avoid mismatch
      if (token.symbol) {
        cache.set(token.symbol.toLowerCase(), token.decimal);
      }
      if (token.name) {
        cache.set(token.name.toLowerCase(), token.decimal);
      }
    });

    return cache;
  }, [curChainConfig]);

  const getTokenDecimal = useCallback(
    (tokenId: string): number => {
      const key = tokenId?.toLowerCase?.() || '';
      if (!key) return 6;

      const cached = decimalCache.get(key);
      if (typeof cached === 'number') {
        return cached;
      }

      // fallback: try to find by symbol/name case-insensitively
      const token = curChainConfig.tokens?.find(
        (t) => t?.symbol?.toLowerCase() === key || t?.name?.toLowerCase() === key
      );
      if (!token) {
        return 6;
      }
      decimalCache.set(key, token.decimal);
      return token.decimal;
    },
    [curChainConfig, decimalCache]
  );
  const trxDecimal = getTokenDecimal('trx');
  const usdtDecimal = getTokenDecimal('usdt');
  return { getTokenDecimal, trxDecimal, usdtDecimal };
};
