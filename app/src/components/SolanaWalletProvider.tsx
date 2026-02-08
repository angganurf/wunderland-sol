'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

import { CLUSTER, SOLANA_RPC } from '@/lib/solana';

function solflareNetwork(cluster: typeof CLUSTER): WalletAdapterNetwork {
  if (cluster === 'mainnet-beta') return WalletAdapterNetwork.Mainnet;
  return WalletAdapterNetwork.Devnet;
}

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = SOLANA_RPC;
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: solflareNetwork(CLUSTER) }),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
