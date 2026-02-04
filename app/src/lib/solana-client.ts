/**
 * Browser-side Solana client for Wunderland Sol.
 *
 * Builds raw transactions using the same instruction encoding as the
 * server-side SDK, but signs via wallet adapter (Phantom/Solflare)
 * instead of a Keypair.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

// ---------- Program ID ----------
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
    'ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88',
);

// ---------- PDA derivation ----------
export function deriveAgentPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), authority.toBuffer()],
    PROGRAM_ID,
  );
}

export function derivePostPDA(agentPDA: PublicKey, postIndex: number): [PublicKey, number] {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(postIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('post'), agentPDA.toBuffer(), indexBuf],
    PROGRAM_ID,
  );
}

export function deriveVotePDA(postPDA: PublicKey, voter: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), postPDA.toBuffer(), voter.toBuffer()],
    PROGRAM_ID,
  );
}

// ---------- Anchor discriminator (SHA-256 first 8 bytes) ----------
async function anchorDiscriminator(methodName: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(`global:${methodName}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash).slice(0, 8);
}

// ---------- HEXACO traits helpers ----------
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

function traitsToU16Array(traits: HEXACOTraits): number[] {
  return TRAIT_KEYS.map((k) => Math.round(Math.max(0, Math.min(1, traits[k])) * 1000));
}

// ---------- Build initialize_agent instruction ----------
export async function buildMintAgentTx(
  authority: PublicKey,
  displayName: string,
  traits: HEXACOTraits,
  connection: Connection,
): Promise<Transaction> {
  const [agentPDA] = deriveAgentPDA(authority);

  // Encode display_name as 32-byte zero-padded buffer
  const nameBytes = new Uint8Array(32);
  const encoded = new TextEncoder().encode(displayName.slice(0, 32));
  nameBytes.set(encoded.slice(0, 32));

  // Encode HEXACO traits as 6 x u16 LE = 12 bytes
  const traitU16 = traitsToU16Array(traits);
  const traitBytes = new Uint8Array(12);
  const traitView = new DataView(traitBytes.buffer);
  traitU16.forEach((v, i) => traitView.setUint16(i * 2, v, true));

  const disc = await anchorDiscriminator('initialize_agent');

  const data = new Uint8Array(8 + 32 + 12);
  data.set(disc, 0);
  data.set(nameBytes, 8);
  data.set(traitBytes, 40);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: agentPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(data),
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = authority;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

// ---------- Build cast_vote transaction ----------
export async function buildCastVoteTx(
  voter: PublicKey,
  postAuthorAuthority: PublicKey,
  postIndex: number,
  value: 1 | -1,
  connection: Connection,
): Promise<Transaction> {
  const [postAgentPDA] = deriveAgentPDA(postAuthorAuthority);
  const [postPDA] = derivePostPDA(postAgentPDA, postIndex);
  const [votePDA] = deriveVotePDA(postPDA, voter);

  const disc = await anchorDiscriminator('cast_vote');
  const data = new Uint8Array(9);
  data.set(disc, 0);
  new DataView(data.buffer).setInt8(8, value);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: votePDA, isSigner: false, isWritable: true },
      { pubkey: postPDA, isSigner: false, isWritable: true },
      { pubkey: postAgentPDA, isSigner: false, isWritable: true },
      { pubkey: voter, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(data),
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = voter;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

// ---------- Check if agent exists ----------
export async function agentExists(
  authority: PublicKey,
  connection: Connection,
): Promise<boolean> {
  const [pda] = deriveAgentPDA(authority);
  const info = await connection.getAccountInfo(pda);
  return info !== null;
}
