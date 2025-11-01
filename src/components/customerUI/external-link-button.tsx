import type { ReactNode } from 'react';
import { useChainConfigStore } from '@/stores/chain-config-store';
import { multiChainConfig } from '@/config/constants';
import { cn } from '@/lib/utils';

export interface ExternalLinkButtonProps {
  hash: string;
  children: ReactNode;
  className?: string;
}

function detectHashType(hash: string): 'address' | 'transaction' {
  if (!hash) return 'transaction';

  const h = hash.trim();

  // TRON address (T + 33 chars) or ETH address (0x + 40 hex chars)
  if ((h.startsWith('T') && h.length === 34) || (h.startsWith('0x') && h.length === 42)) {
    return 'address';
  }

  // Default to transaction (ETH: 0x + 64 hex chars, TRON: 64 hex chars)
  return 'transaction';
}

export function ExternalLinkButton({ children, hash, className }: ExternalLinkButtonProps) {
  const curChainConfig = useChainConfigStore((state) => state.curChainConfig);
  const scanUrl =
    multiChainConfig.find((config) => config.chain === curChainConfig.chain)?.scan_url || '';

  const detectedType = detectHashType(hash);
  const href = `${scanUrl}${detectedType}/${hash}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('cursor-pointer hover:opacity-80 transition-opacity', className)}
    >
      {children}
    </a>
  );
}
