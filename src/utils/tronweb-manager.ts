import { TronWeb } from 'tronweb';
import { TRONWEB_CONFIG } from '../config/constants';

// TronWeb instance cache
const tronWebInstances = new Map<string, TronWeb>();

// instance usage time record
const instanceUsageTime = new Map<string, number>();

/**
 * get global TronWeb instance
 * @param network network type ('mainnet' | 'nile')
 * @returns TronWeb instance
 */
export function getTronWebInstance(network: string = TRONWEB_CONFIG.DEFAULT_NETWORK): TronWeb {
  // check if instance is already cached
  if (tronWebInstances.has(network)) {
    const instance = tronWebInstances.get(network)!;
    instanceUsageTime.set(network, Date.now());
    return instance;
  }

  // create new instance
  const networkConfig = TRONWEB_CONFIG.NETWORKS[network as keyof typeof TRONWEB_CONFIG.NETWORKS];
  if (!networkConfig) {
    throw new Error(`unsupported network type: ${network}`);
  }

  const tronWeb = new TronWeb({
    fullHost: networkConfig.fullHost,
    headers: networkConfig.headers,
  });

  // cache instance
  if (TRONWEB_CONFIG.CACHE.ENABLED) {
    tronWebInstances.set(network, tronWeb);
    instanceUsageTime.set(network, Date.now());

    // if cache instance is too many, clean the oldest instance
    if (tronWebInstances.size > TRONWEB_CONFIG.CACHE.MAX_INSTANCES) {
      cleanupOldInstances();
    }
  }

  return tronWeb;
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

/**
 * initialize global TronWeb instance (call after wallet import success)
 * @param network default is 'nile'
 * @returns TronWeb instance
 */
export function initializeGlobalTronWeb(network: string = 'nile'): TronWeb {
  try {
    // get and cache TronWeb instance
    const tronWeb = getTronWebInstance(network);

    return tronWeb;
  } catch (error) {
    console.error('initialize global TronWeb instance failed:', error);
    throw error;
  }
}

/**
 * check if global TronWeb instance is initialized
 * @param network network type
 * @returns boolean
 */
export function isGlobalTronWebInitialized(network: string = 'nile'): boolean {
  return hasCachedInstance(network);
}
