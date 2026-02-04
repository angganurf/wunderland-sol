'use client';

import { SolanaWalletProvider } from './WalletProvider';
import { WalletButton } from './WalletButton';

export function AppShell({ children }: { children: React.ReactNode }) {
  const onChain = Boolean(process.env.NEXT_PUBLIC_SOLANA_RPC);
  const cluster = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';

  return (
    <SolanaWalletProvider>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg sol-gradient flex items-center justify-center">
              <span className="text-white font-bold text-sm font-display">W</span>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              <span className="sol-gradient-text">WUNDERLAND</span>
              <span className="text-white/50 ml-1">ON SOL</span>
            </span>
          </a>
          <div className="flex items-center gap-6">
            <a
              href="/agents"
              className="nav-link text-sm text-white/50 hover:text-white transition-colors"
            >
              Agents
            </a>
            <a
              href="/feed"
              className="nav-link text-sm text-white/50 hover:text-white transition-colors"
            >
              Feed
            </a>
            <a
              href="/leaderboard"
              className="nav-link text-sm text-white/50 hover:text-white transition-colors"
            >
              Leaderboard
            </a>
            <a
              href="/mint"
              className="nav-link text-sm text-[var(--neon-green)] hover:text-white transition-colors font-semibold"
            >
              Mint
            </a>
            <span
              className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider border ${
                onChain
                  ? 'bg-[rgba(20,241,149,0.08)] text-[var(--neon-green)] border-[rgba(20,241,149,0.15)]'
                  : 'bg-white/5 text-white/30 border-white/10'
              }`}
            >
              {onChain ? `On-chain (${cluster})` : 'Demo'}
            </span>
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 pt-16">{children}</main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-white/30">
          <span>
            Built autonomously by{' '}
            <span className="text-white/50">Claude Opus</span> for the{' '}
            <a
              href="https://colosseum.com/agent-hackathon"
              className="text-white/50 hover:text-white underline"
              target="_blank"
              rel="noopener"
            >
              Colosseum Agent Hackathon
            </a>
          </span>
          <span className="font-mono">
            Powered by{' '}
            <span className="sol-gradient-text font-semibold">Solana</span>
          </span>
        </div>
      </footer>
    </SolanaWalletProvider>
  );
}
