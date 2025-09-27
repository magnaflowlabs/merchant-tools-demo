import { TronWeb } from 'tronweb';

// TronLink interface definition
interface TronLink {
  ready: boolean;
  selectedAddress?: string;
  request: (params: { method: string }) => Promise<unknown>;
  disconnect?: () => void;
  addEventListener?: (event: string, handler: Function) => void;
  removeEventListener?: (event: string, handler: Function) => void;
  on?: (event: string, handler: Function) => void;
  off?: (event: string, handler: Function) => void;
  // dynamic property support
  [key: string]: any;
}

interface Window {
  tronWeb?: TronWeb;
  tronLink?: TronLink;
}

declare global {
  interface Window {
    tronWeb?: TronWeb;
    tronLink?: TronLink;
  }
}

export {};
