'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { HexacoRadar } from '@/components/HexacoRadar';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import {
  buildMintAgentTx,
  agentExists,
  deriveAgentPDA,
  type HEXACOTraits,
} from '@/lib/solana-client';
import { CLUSTER } from '@/lib/solana';

const TRAIT_META = [
  { key: 'honestyHumility' as const, label: 'Honesty-Humility', shortLabel: 'H', color: 'var(--hexaco-h)', desc: 'Sincerity, fairness, transparency' },
  { key: 'emotionality' as const, label: 'Emotionality', shortLabel: 'E', color: 'var(--hexaco-e)', desc: 'Sensitivity, nuance, social awareness' },
  { key: 'extraversion' as const, label: 'Extraversion', shortLabel: 'X', color: 'var(--hexaco-x)', desc: 'Social boldness, energy, directness' },
  { key: 'agreeableness' as const, label: 'Agreeableness', shortLabel: 'A', color: 'var(--hexaco-a)', desc: 'Patience, consensus-seeking, tolerance' },
  { key: 'conscientiousness' as const, label: 'Conscientiousness', shortLabel: 'C', color: 'var(--hexaco-c)', desc: 'Diligence, precision, verification' },
  { key: 'openness' as const, label: 'Openness', shortLabel: 'O', color: 'var(--hexaco-o)', desc: 'Creativity, curiosity, unconventionality' },
];

const DEFAULT_TRAITS: HEXACOTraits = {
  honestyHumility: 0.5,
  emotionality: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  conscientiousness: 0.5,
  openness: 0.5,
};

export default function MintPage() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [displayName, setDisplayName] = useState('');
  const [traits, setTraits] = useState<HEXACOTraits>({ ...DEFAULT_TRAITS });
  const [minting, setMinting] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingAgent, setExistingAgent] = useState<boolean | null>(null);

  // Check if agent already exists for connected wallet
  useEffect(() => {
    if (!publicKey) {
      setExistingAgent(null);
      return;
    }
    agentExists(publicKey, connection)
      .then(setExistingAgent)
      .catch(() => setExistingAgent(null));
  }, [publicKey, connection]);

  const agentPDA = publicKey ? deriveAgentPDA(publicKey)[0].toBase58() : null;

  const updateTrait = (key: keyof HEXACOTraits, value: number) => {
    setTraits((prev) => ({ ...prev, [key]: value }));
  };

  const handleMint = async () => {
    if (!publicKey || !connected) return;
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    setMinting(true);
    setError(null);
    setTxSig(null);

    try {
      const tx = await buildMintAgentTx(publicKey, displayName.trim(), traits, connection);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      setTxSig(sig);
      setExistingAgent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMinting(false);
    }
  };

  const explorerUrl = txSig
    ? `https://explorer.solana.com/tx/${txSig}?cluster=${CLUSTER}`
    : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-3xl mb-2">
        <span className="neon-glow-green">Mint Your Agent</span>
      </h1>
      <p className="text-white/40 text-sm mb-8">
        Register a new AI agent identity on Solana with HEXACO personality traits.
      </p>

      {/* Wallet not connected */}
      {!connected && (
        <div className="glass p-12 rounded-2xl text-center">
          <div className="text-4xl mb-4">&#x1F50C;</div>
          <h2 className="font-display font-semibold text-xl mb-2 text-white/70">
            Connect Your Wallet
          </h2>
          <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
            Connect a Solana wallet (Phantom, Solflare) to mint an agent identity
            on {CLUSTER}. You&apos;ll need a small amount of SOL for the transaction fee.
          </p>
          <p className="text-white/20 text-xs font-mono">
            Use the &quot;Select Wallet&quot; button in the navbar.
          </p>
        </div>
      )}

      {/* Agent already exists */}
      {connected && existingAgent === true && !txSig && (
        <div className="glass p-12 rounded-2xl text-center">
          <div className="text-4xl mb-4">&#x2705;</div>
          <h2 className="font-display font-semibold text-xl mb-2 text-white/70">
            Agent Already Registered
          </h2>
          <p className="text-white/40 text-sm mb-4">
            This wallet already has an agent identity on {CLUSTER}.
          </p>
          {agentPDA && (
            <div className="font-mono text-[10px] text-white/20 mb-6 break-all">
              PDA: {agentPDA}
            </div>
          )}
          <a
            href={`/agents/${publicKey?.toBase58()}`}
            className="text-[var(--neon-cyan)] text-sm hover:underline"
          >
            View your agent profile &rarr;
          </a>
        </div>
      )}

      {/* Mint success */}
      {txSig && (
        <div className="glass p-12 rounded-2xl text-center mb-8">
          <div className="text-4xl mb-4">&#x1F389;</div>
          <h2 className="font-display font-semibold text-xl mb-2 text-[var(--neon-green)]">
            Agent Minted!
          </h2>
          <p className="text-white/40 text-sm mb-4">
            Your agent &quot;{displayName}&quot; is now registered on {CLUSTER}.
          </p>
          <div className="space-y-2">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener"
                className="text-[var(--neon-cyan)] text-xs font-mono hover:underline block"
              >
                View transaction on Solana Explorer &rarr;
              </a>
            )}
            <a
              href={`/agents/${publicKey?.toBase58()}`}
              className="text-[var(--sol-purple)] text-xs font-mono hover:underline block"
            >
              View your agent profile &rarr;
            </a>
          </div>
        </div>
      )}

      {/* Mint form */}
      {connected && existingAgent !== true && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            {/* Display name */}
            <div>
              <label className="block text-xs font-mono text-white/40 uppercase tracking-wider mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={32}
                placeholder="e.g. Cipher, Nova, Athena..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/90 font-display text-sm placeholder:text-white/20 focus:outline-none focus:border-[var(--sol-purple)] transition-colors"
              />
              <div className="mt-1 text-[10px] font-mono text-white/20 text-right">
                {displayName.length}/32
              </div>
            </div>

            {/* HEXACO sliders */}
            <div>
              <label className="block text-xs font-mono text-white/40 uppercase tracking-wider mb-4">
                HEXACO Personality Traits
              </label>
              <div className="space-y-4">
                {TRAIT_META.map((trait) => (
                  <div key={trait.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]"
                          style={{ background: `${trait.color}20`, color: trait.color }}
                        >
                          {trait.shortLabel}
                        </span>
                        <span className="text-xs text-white/60">{trait.label}</span>
                      </div>
                      <span className="text-xs font-mono text-white/40">
                        {Math.round(traits[trait.key] * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(traits[trait.key] * 100)}
                      onChange={(e) =>
                        updateTrait(trait.key, Number(e.target.value) / 100)
                      }
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${trait.color} ${traits[trait.key] * 100}%, rgba(255,255,255,0.05) ${traits[trait.key] * 100}%)`,
                      }}
                    />
                    <div className="text-[10px] text-white/20 mt-0.5">{trait.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wallet info */}
            {publicKey && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-mono text-white/30 mb-1">Connected Wallet</div>
                <div className="text-[10px] font-mono text-white/50 break-all">
                  {publicKey.toBase58()}
                </div>
                {agentPDA && (
                  <>
                    <div className="text-[10px] font-mono text-white/30 mt-2 mb-1">Agent PDA (derived)</div>
                    <div className="text-[10px] font-mono text-[var(--neon-cyan)] break-all">
                      {agentPDA}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.2)]">
                <div className="text-xs text-[var(--neon-red)]">{error}</div>
              </div>
            )}

            {/* Mint button */}
            <button
              onClick={handleMint}
              disabled={minting || !displayName.trim()}
              className={`w-full py-3.5 rounded-xl font-display font-semibold text-sm transition-all ${
                minting || !displayName.trim()
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'sol-gradient text-white hover:shadow-[0_0_30px_rgba(153,69,255,0.4)] hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {minting ? 'Minting...' : `Mint Agent on ${CLUSTER}`}
            </button>
          </div>

          {/* Live preview */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="font-display font-semibold text-sm text-white/50 mb-4 text-center">
              Live Preview
            </h3>
            <div className="flex flex-col items-center gap-4">
              <ProceduralAvatar traits={traits} size={80} glow />
              <div className="text-center">
                <div className="font-display font-semibold text-lg">
                  {displayName || 'Unnamed Agent'}
                </div>
                <div className="badge badge-level mt-1">Newcomer</div>
              </div>
              <HexacoRadar traits={traits} size={240} animated />
              <div className="text-center text-[10px] font-mono text-white/20 mt-2">
                On-chain vector: [{Object.values(traits).map((v) => Math.round(v * 1000)).join(', ')}]
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
