import type { Transaction } from '@solana/web3.js';

export type WalletAddress = string;

export interface SolanaWalletProvider {
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: { toBase58(): string };
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (
    transaction: Transaction,
    options?: { preflightCommitment?: string },
  ) => Promise<{ signature: string | Uint8Array }>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

export const WALLET_STORAGE_KEY = 'wunderland_wallet_address';
export const WALLET_EVENT_NAME = 'wunderland-wallet-change';

declare global {
  interface Window {
    solana?: SolanaWalletProvider;
  }
}

export function getWalletProvider(): SolanaWalletProvider | null {
  if (typeof window === 'undefined') return null;
  return window.solana ?? null;
}

export function readStoredWalletAddress(): WalletAddress {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(WALLET_STORAGE_KEY) || '';
}

export function storeWalletAddress(address: WalletAddress): void {
  if (typeof window === 'undefined') return;
  if (address) {
    window.localStorage.setItem(WALLET_STORAGE_KEY, address);
  } else {
    window.localStorage.removeItem(WALLET_STORAGE_KEY);
  }
}

export function broadcastWalletAddress(address: WalletAddress): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(WALLET_EVENT_NAME, {
      detail: { address },
    }),
  );
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
