/**
 * Client-side agent minting logic for WUNDERLAND ON SOL.
 *
 * Self-contained — no SDK dependency. Builds the initializeAgent
 * instruction inline using the same layout as the Anchor program.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { PROGRAM_ID, SOLANA_RPC } from './solana';
import type { SolanaWalletProvider } from './wallet';

// ============================================================
// Constants
// ============================================================

export const MAX_AGENTS_PER_WALLET = 5;
export const FREE_AGENT_CAP = 1_000;
export const LOW_FEE_AGENT_CAP = 5_000;
export const LOW_FEE_SOL = 0.1;
export const HIGH_FEE_SOL = 0.5;

const LAMPORTS_PER_SOL = 1_000_000_000;

export function registrationFeeLamports(agentCount: number): number {
  if (agentCount < FREE_AGENT_CAP) return 0;
  if (agentCount < LOW_FEE_AGENT_CAP) return LAMPORTS_PER_SOL / 10; // 0.1 SOL
  return LAMPORTS_PER_SOL / 2; // 0.5 SOL
}

export function registrationFeeSol(agentCount: number): number {
  if (agentCount < FREE_AGENT_CAP) return 0;
  if (agentCount < LOW_FEE_AGENT_CAP) return LOW_FEE_SOL;
  return HIGH_FEE_SOL;
}

export function pricingTier(agentCount: number): 'free' | 'low' | 'high' {
  if (agentCount < FREE_AGENT_CAP) return 'free';
  if (agentCount < LOW_FEE_AGENT_CAP) return 'low';
  return 'high';
}

// ============================================================
// HEXACO traits
// ============================================================

export interface HEXACOTraits {
  honestyHumility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

const TRAIT_KEYS: (keyof HEXACOTraits)[] = [
  'honestyHumility',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
];

export const TRAIT_INFO = [
  { key: 'honestyHumility' as const, label: 'Honesty-Humility', short: 'H', color: 'var(--hexaco-h)', desc: 'Sincerity, fairness, lack of greed' },
  { key: 'emotionality' as const, label: 'Emotionality', short: 'E', color: 'var(--hexaco-e)', desc: 'Sensitivity, attachment, empathy' },
  { key: 'extraversion' as const, label: 'Extraversion', short: 'X', color: 'var(--hexaco-x)', desc: 'Social boldness, energy, engagement' },
  { key: 'agreeableness' as const, label: 'Agreeableness', short: 'A', color: 'var(--hexaco-a)', desc: 'Patience, tolerance, cooperation' },
  { key: 'conscientiousness' as const, label: 'Conscientiousness', short: 'C', color: 'var(--hexaco-c)', desc: 'Diligence, precision, thoroughness' },
  { key: 'openness' as const, label: 'Openness', short: 'O', color: 'var(--hexaco-o)', desc: 'Curiosity, creativity, unconventionality' },
];

export const PRESETS: { name: string; traits: HEXACOTraits }[] = [
  { name: 'Helpful Assistant', traits: { honestyHumility: 0.85, emotionality: 0.45, extraversion: 0.7, agreeableness: 0.9, conscientiousness: 0.85, openness: 0.6 } },
  { name: 'Creative Thinker', traits: { honestyHumility: 0.7, emotionality: 0.55, extraversion: 0.65, agreeableness: 0.6, conscientiousness: 0.5, openness: 0.95 } },
  { name: 'Analytical Researcher', traits: { honestyHumility: 0.8, emotionality: 0.3, extraversion: 0.4, agreeableness: 0.55, conscientiousness: 0.9, openness: 0.85 } },
  { name: 'Empathetic Counselor', traits: { honestyHumility: 0.75, emotionality: 0.85, extraversion: 0.6, agreeableness: 0.9, conscientiousness: 0.65, openness: 0.7 } },
  { name: 'Decisive Executor', traits: { honestyHumility: 0.6, emotionality: 0.25, extraversion: 0.85, agreeableness: 0.45, conscientiousness: 0.8, openness: 0.5 } },
];

function traitsToU16(traits: HEXACOTraits): number[] {
  return TRAIT_KEYS.map((k) => Math.round(Math.min(1, Math.max(0, traits[k])) * 1000));
}

// ============================================================
// Encoding helpers (mirror SDK exactly)
// ============================================================

function anchorDiscriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function encodeFixedBytes(value: Uint8Array, len: number): Buffer {
  if (value.length !== len) throw new Error(`Expected ${len} bytes, got ${value.length}`);
  return Buffer.from(value);
}

function encodeFixedString32(value: string): Buffer {
  const out = Buffer.alloc(32, 0);
  Buffer.from(value, 'utf8').copy(out, 0, 0, 32);
  return out;
}

function encodeU16Array(values: number[]): Buffer {
  const out = Buffer.alloc(values.length * 2);
  for (let i = 0; i < values.length; i++) {
    out.writeUInt16LE(values[i] >>> 0, i * 2);
  }
  return out;
}

// ============================================================
// PDA derivation
// ============================================================

const programId = new PublicKey(PROGRAM_ID);

export function deriveConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
}

export function deriveTreasuryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
}

export function deriveAgentPDA(owner: PublicKey, agentId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), owner.toBuffer(), encodeFixedBytes(agentId, 32)],
    programId,
  );
}

export function deriveVaultPDA(agentIdentityPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), agentIdentityPda.toBuffer()],
    programId,
  );
}

// ============================================================
// Metadata hashing
// ============================================================

function sortJsonRecursively(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonRecursively);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortJsonRecursively(record[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalizeJson(obj: unknown): string {
  return JSON.stringify(sortJsonRecursively(obj));
}

export function hashSha256(text: string): Uint8Array {
  return createHash('sha256').update(text, 'utf8').digest();
}

export interface AgentMetadata {
  schema: string;
  displayName: string;
  seed: {
    prompt: string;
    abilities: string[];
  };
  hexacoU16: number[];
  createdBy: string;
}

export function buildAgentMetadata(opts: {
  displayName: string;
  prompt: string;
  abilities: string[];
  traits: HEXACOTraits;
}): AgentMetadata {
  return {
    schema: 'wunderland.agent-metadata.v1',
    displayName: opts.displayName,
    seed: {
      prompt: opts.prompt,
      abilities: opts.abilities,
    },
    hexacoU16: traitsToU16(opts.traits),
    createdBy: 'wunderland-mint-ui',
  };
}

export function hashMetadata(metadata: AgentMetadata): Uint8Array {
  return hashSha256(canonicalizeJson(metadata));
}

// ============================================================
// Agent signer keypair
// ============================================================

export function generateAgentSigner(): Keypair {
  return Keypair.generate();
}

export function keypairToJson(keypair: Keypair): string {
  return JSON.stringify({
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Array.from(keypair.secretKey),
  });
}

// ============================================================
// Build mint transaction
// ============================================================

export interface MintAgentOpts {
  owner: PublicKey;
  displayName: string;
  traits: HEXACOTraits;
  prompt: string;
  abilities: string[];
  agentSigner: Keypair;
}

export function buildMintInstruction(opts: MintAgentOpts): {
  instruction: TransactionInstruction;
  agentId: Uint8Array;
  agentIdentityPda: PublicKey;
  vaultPda: PublicKey;
  metadataHash: Uint8Array;
} {
  // Random 32-byte agent ID
  const agentId = new Uint8Array(32);
  crypto.getRandomValues(agentId);

  // Derive PDAs
  const [configPda] = deriveConfigPDA();
  const [treasuryPda] = deriveTreasuryPDA();
  const [agentIdentityPda] = deriveAgentPDA(opts.owner, agentId);
  const [vaultPda] = deriveVaultPDA(agentIdentityPda);

  // Build metadata and hash
  const metadata = buildAgentMetadata({
    displayName: opts.displayName,
    prompt: opts.prompt,
    abilities: opts.abilities,
    traits: opts.traits,
  });
  const metadataHash = hashMetadata(metadata);

  // Encode instruction data (mirrors SDK buildInitializeAgentIx exactly)
  const data = Buffer.concat([
    anchorDiscriminator('initialize_agent'),
    encodeFixedBytes(agentId, 32),
    encodeFixedString32(opts.displayName),
    encodeU16Array(traitsToU16(opts.traits)),
    encodeFixedBytes(metadataHash, 32),
    opts.agentSigner.publicKey.toBuffer(),
  ]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: treasuryPda, isSigner: false, isWritable: true },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
      { pubkey: agentIdentityPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  return { instruction, agentId, agentIdentityPda, vaultPda, metadataHash };
}

// ============================================================
// Submit transaction via wallet provider
// ============================================================

export async function submitMintTransaction(opts: {
  provider: SolanaWalletProvider;
  owner: PublicKey;
  instruction: TransactionInstruction;
}): Promise<string> {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const tx = new Transaction().add(opts.instruction);
  tx.feePayer = opts.owner;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;

  let signature: string;

  if (opts.provider.signAndSendTransaction) {
    const res = await opts.provider.signAndSendTransaction(tx, {
      preflightCommitment: 'confirmed',
    });
    signature = typeof res.signature === 'string' ? res.signature : Buffer.from(res.signature).toString('base64');
  } else if (opts.provider.signTransaction) {
    const signed = await opts.provider.signTransaction(tx);
    signature = await connection.sendRawTransaction(signed.serialize(), {
      preflightCommitment: 'confirmed',
    });
  } else {
    throw new Error('Wallet cannot sign transactions');
  }

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  return signature;
}

// ============================================================
// API helpers
// ============================================================

export async function fetchNetworkAgentCount(): Promise<number> {
  const res = await fetch('/api/stats');
  if (!res.ok) return 0;
  const data = await res.json();
  return data.totalAgents ?? 0;
}

export async function fetchWalletAgentCount(ownerAddress: string): Promise<number> {
  const res = await fetch(`/api/agents?owner=${encodeURIComponent(ownerAddress)}`);
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total ?? 0;
}
