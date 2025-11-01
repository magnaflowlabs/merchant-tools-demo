export const CHAIN_COLORS = {
  trx: 'from-blue-500/20 to-blue-600/40',
  trx_nil: 'from-purple-500/20 to-purple-600/40',
  eth: 'from-gray-500/20 to-gray-600/40',
  default: 'from-primary/20 to-primary/40',
} as const;

export const ANIMATION_DELAY_MS = 50;
export const ICON_SIZE = 'w-6 h-6';
export const MIN_SELECT_WIDTH = 'min-w-[140px]';
export const MIN_CONTENT_WIDTH = 'min-w-[200px]';
export const MAX_CONTENT_HEIGHT = 'max-h-[300px]';

export const getChainColor = (chain: string): string => {
  return CHAIN_COLORS[chain as keyof typeof CHAIN_COLORS] || CHAIN_COLORS.default;
};

export const getChainDisplayName = (chainConfig: any): string => {
  return chainConfig.chain_name || chainConfig.name || chainConfig.chain;
};
