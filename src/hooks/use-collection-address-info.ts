import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useChainConfigStore } from '@/stores/chain-config-store';
import type { CollectionAddressInfo } from '@/types/merchant';

/**
 * Automatically derive collection address info for current chain based on current chain config and profile's collection address list
 * This is a derived state, no manual setting required
 */
export function useCollectionAddressInfo(): CollectionAddressInfo {
  const profileData = useAuthStore((state) => state.profileData);
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);

  const collectionAddressInfo = useMemo<CollectionAddressInfo>(() => {
    const currentChain = curChainConfig.chain;

    // If no current chain or profile's collection address list is empty, return empty config
    if (!currentChain || !profileData?.collection_addresses?.length) {
      return {
        chain: currentChain || '',
        collection_address: '',
        payout_contract_address: '',
        payout_contract_version: '',
      };
    }

    // Find collection address configuration matching current chain
    const chainAddress = profileData.collection_addresses.find(
      (addr) => addr.chain === currentChain
    );

    if (!chainAddress) {
      console.warn(`Collection address configuration not found for chain ${currentChain}`);
      return {
        chain: currentChain,
        collection_address: '',
        payout_contract_address: '',
        payout_contract_version: '',
      };
    }

    return {
      chain: currentChain,
      collection_address: chainAddress.collection_address || '',
      payout_contract_address: chainAddress.payout_contract_address || '',
      payout_contract_version: chainAddress.payout_contract_version || '',
    };
  }, [curChainConfig.chain, profileData?.collection_addresses]);

  return collectionAddressInfo;
}
