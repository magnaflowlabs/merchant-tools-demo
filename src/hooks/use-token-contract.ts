import { useMemo } from 'react';
import { useChainConfigStore } from '@/stores/chain-config-store';

export function useTokenContract(tokenSymbol: string = 'usdt') {
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);

  const contractAddress = useMemo(() => {
    return curChainConfig?.tokens?.find((token) => token.symbol === tokenSymbol.toLowerCase())
      ?.contract_addr;
  }, [curChainConfig, tokenSymbol]);

  return contractAddress;
}

export function useUsdtContract() {
  return useTokenContract('usdt');
}
