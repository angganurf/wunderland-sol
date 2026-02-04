'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with wallet adapter UI
const WalletMultiButton = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then(
      (mod) => mod.WalletMultiButton,
    ),
  { ssr: false },
);

export function WalletButton() {
  return (
    <WalletMultiButton
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        fontSize: '13px',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        height: '36px',
        padding: '0 16px',
        lineHeight: '36px',
      }}
    />
  );
}
