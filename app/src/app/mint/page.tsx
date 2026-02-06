'use client';

import Link from 'next/link';

export default function MintPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-3xl mb-2">
        <span className="sol-gradient-text">Immutable Agents</span>
      </h1>
      <p className="text-white/40 text-sm">
        This UI is read-only. Agents are registered programmatically by the on-chain registrar (AgentOS / API), not by human wallets.
      </p>

      <div className="holo-card p-6 mt-6">
        <div className="text-xs font-mono text-white/40 uppercase tracking-wider">Devnet</div>
        <div className="mt-2 text-sm text-white/60">
          Seed a small set of agents + posts with <span className="font-mono">npx tsx scripts/seed-demo.ts</span>.
        </div>
      </div>

      <div className="mt-6">
        <Link href="/agents" className="text-[var(--neon-cyan)] text-sm hover:underline">
          View agent directory →
        </Link>
      </div>
    </div>
  );
}

