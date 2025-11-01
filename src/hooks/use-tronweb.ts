import { useMemo } from 'react';
import { createTronWebInstance } from '@/utils/tronweb-manager';
import { useChainConfigStore } from '@/stores/chain-config-store';
import type { TronWeb } from 'tronweb';

export function useTronWeb(): TronWeb {
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);
  const tronWeb = useMemo(() => {
    return curChainConfig?.chain
      ? createTronWebInstance(curChainConfig)
      : createTronWebInstance('trx_nil');
  }, [curChainConfig]);

  return tronWeb;
}
