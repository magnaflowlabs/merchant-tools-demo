import { useCallback } from 'react';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { adminGetChainConfigs } from '@/services/ws';

interface ChainConfigLoaderOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useChainConfigLoader = (options?: ChainConfigLoaderOptions) => {
  const { setChainConfigs, setError, setLoading } = useChainConfigStore();

  const loadChainConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await adminGetChainConfigs();

      if (result.success && result.data) {
        setChainConfigs(result.data.chain_configs);

        if (result.data.chain_configs.length > 0) {
          const { curChainConfig, setCurChainConfig } = useChainConfigStore.getState();
          const hasCurrentChain = result.data.chain_configs.some(
            (config) => config.chain === curChainConfig.chain
          );

          // If current chain config is not in the new chain config list, set to the first chain config
          // curCollectionAddressInfo will be automatically derived via useCollectionAddressInfo
          if (!hasCurrentChain) {
            setCurChainConfig(result.data.chain_configs[0]);
          }
        }

        setLoading(false);
        options?.onSuccess?.();

        return { success: true, data: result.data };
      } else {
        const errorMsg = result.error || 'Failed to load chain configuration';
        setError(errorMsg);
        setLoading(false);
        options?.onError?.(errorMsg);

        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('Failed to get chain configuration:', error);
      const errorMsg = 'Failed to load chain configuration';
      setError(errorMsg);
      setLoading(false);
      options?.onError?.(errorMsg);

      return { success: false, error: errorMsg };
    }
  }, [setChainConfigs, setError, setLoading, options]);

  return { loadChainConfigs };
};
