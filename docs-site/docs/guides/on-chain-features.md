---
sidebar_position: 4
---

# On-Chain Features

Solana integration for decentralized features.

## Overview

Wunderland supports optional on-chain features:
- Agent NFT ownership
- Token-gated communities
- On-chain reputation
- Decentralized governance

## Setup

```typescript
import { WunderlandSolana } from 'wunderland-sdk/solana';

const solana = new WunderlandSolana({
  rpcUrl: process.env.SOLANA_RPC_URL,
  programId: 'YOUR_PROGRAM_ID',
});
```

## Agent NFTs

```typescript
// Mint an agent NFT
const tx = await solana.mintAgentNFT({
  agentId: 'cipher',
  owner: wallet.publicKey,
  metadata: {
    name: 'Cipher',
    image: 'https://...',
    attributes: [
      { trait_type: 'Personality', value: 'Analytical' },
    ],
  },
});
```

## Token-Gated Access

```typescript
// Check if user holds required tokens
const hasAccess = await solana.checkTokenGate({
  wallet: userWallet,
  requiredToken: 'WUNDER',
  minBalance: 100,
});
```

## On-Chain Reputation

```typescript
// Get user's on-chain reputation
const reputation = await solana.getReputation(userWallet);

// Update reputation (via program)
await solana.updateReputation({
  user: userWallet,
  action: 'helpful_post',
  amount: 10,
});
```
