import { TronWeb } from 'tronweb';
import { TRONWEB_CONFIG } from '../config/constants';
import type { ChainConfig } from '@/types/merchant';

const tronWebInstances = new Map<string, TronWeb>();

const instanceUsageTime = new Map<string, number>();

export function getChainConfigByName(
  chainConfigs: ChainConfig[],
  chainName: string
): ChainConfig | undefined {
  return chainConfigs.find((config) => config.chain === chainName);
}

export function getTronWebInstance(networkOrConfig?: string | ChainConfig): TronWeb {
  let cacheKey: string;
  let fullHost: string;
  let headers: Record<string, string> | undefined;

  // handle ChainConfig object
  if (typeof networkOrConfig === 'object' && networkOrConfig !== null) {
    const chainConfig = networkOrConfig as ChainConfig;
    cacheKey = chainConfig.chain;
    fullHost = chainConfig.rpc_url;
    headers = undefined; // ChainConfig doesn't include headers, use default
  } else {
    // handle string network parameter (backward compatibility)
    const network = networkOrConfig || TRONWEB_CONFIG.DEFAULT_NETWORK;
    cacheKey = network;
    const networkConfig = TRONWEB_CONFIG.NETWORKS[network as keyof typeof TRONWEB_CONFIG.NETWORKS];
    if (!networkConfig) {
      throw new Error(`unsupported network type: ${network}`);
    }
    fullHost = networkConfig.fullHost;
    headers = networkConfig.headers;
  }

  // check if instance is already cached
  if (tronWebInstances.has(cacheKey)) {
    const instance = tronWebInstances.get(cacheKey)!;
    instanceUsageTime.set(cacheKey, Date.now());
    return instance;
  }

  // create new instance
  const tronWeb = new TronWeb({
    fullHost,
    headers,
  });

  // cache instance
  if (TRONWEB_CONFIG.CACHE.ENABLED) {
    tronWebInstances.set(cacheKey, tronWeb);
    instanceUsageTime.set(cacheKey, Date.now());

    // if cache instance is too many, clean the oldest instance
    if (tronWebInstances.size > TRONWEB_CONFIG.CACHE.MAX_INSTANCES) {
      cleanupOldInstances();
    }
  }

  return tronWeb;
}

/**
 * Always create a brand-new TronWeb instance without using cache.
 * Useful when callers need strict instance isolation (e.g., avoid state bleed).
 */
export function createTronWebInstance(networkOrConfig?: string | ChainConfig): TronWeb {
  let fullHost: string;
  let headers: Record<string, string> | undefined;

  if (typeof networkOrConfig === 'object' && networkOrConfig !== null) {
    const chainConfig = networkOrConfig as ChainConfig;
    fullHost = chainConfig.rpc_url;
    headers = undefined;
  } else {
    const network = networkOrConfig || TRONWEB_CONFIG.DEFAULT_NETWORK;
    const networkConfig = TRONWEB_CONFIG.NETWORKS[network as keyof typeof TRONWEB_CONFIG.NETWORKS];
    if (!networkConfig) {
      throw new Error(`unsupported network type: ${network}`);
    }
    fullHost = networkConfig.fullHost;
    headers = networkConfig.headers;
  }

  return new TronWeb({ fullHost, headers });
}

/**
 * clean old TronWeb instance
 */
function cleanupOldInstances(): void {
  if (tronWebInstances.size <= TRONWEB_CONFIG.CACHE.MAX_INSTANCES) {
    return;
  }

  // find the oldest instance
  let oldestNetwork = '';
  let oldestTime = Date.now();

  for (const [network, time] of instanceUsageTime.entries()) {
    if (time < oldestTime) {
      oldestTime = time;
      oldestNetwork = network;
    }
  }

  // remove the oldest instance
  if (oldestNetwork) {
    tronWebInstances.delete(oldestNetwork);
    instanceUsageTime.delete(oldestNetwork);
  }
}

/**
 * clean all TronWeb instance cache
 */
export function clearTronWebCache(): void {
  tronWebInstances.clear();
  instanceUsageTime.clear();
}

/**
 * get current cached instance count
 */
export function getCachedInstanceCount(): number {
  return tronWebInstances.size;
}

/**
 * check if specified network has cached instance
 */
export function hasCachedInstance(network: string): boolean {
  return tronWebInstances.has(network);
}

/**
 * periodically clean expired instance
 */
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [network, time] of instanceUsageTime.entries()) {
      if (now - time > TRONWEB_CONFIG.CACHE.CLEANUP_INTERVAL) {
        tronWebInstances.delete(network);
        instanceUsageTime.delete(network);
      }
    }
  }, TRONWEB_CONFIG.CACHE.CLEANUP_INTERVAL);
}

// export default instance get function
export default getTronWebInstance;

export function initializeGlobalTronWeb(networkOrConfig?: string | ChainConfig): TronWeb {
  try {
    // get and cache TronWeb instance
    const tronWeb = getTronWebInstance(networkOrConfig || 'nile');

    return tronWeb;
  } catch (error) {
    console.error('initialize global TronWeb instance failed:', error);
    throw error;
  }
}

export function isGlobalTronWebInitialized(networkOrConfig?: string | ChainConfig): boolean {
  let cacheKey: string;
  if (typeof networkOrConfig === 'object' && networkOrConfig !== null) {
    cacheKey = (networkOrConfig as ChainConfig).chain;
  } else {
    cacheKey = networkOrConfig || 'nile';
  }
  return hasCachedInstance(cacheKey);
}
