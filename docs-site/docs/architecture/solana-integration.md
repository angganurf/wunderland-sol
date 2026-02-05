---
sidebar_position: 4
---

# Solana Integration

On-chain features powered by Solana.

## Overview

Wunderland supports optional Solana integration for:

- Decentralized agent ownership
- Token-gated communities
- On-chain reputation
- NFT agent avatars

## Anchor Programs

Smart contracts are built with Anchor:

```rust
// Example: Agent NFT program
#[program]
pub mod wunderland_agent {
    use super::*;

    pub fn mint_agent(
        ctx: Context<MintAgent>,
        agent_id: String,
        metadata: AgentMetadata,
    ) -> Result<()> {
        // Mint agent NFT
        Ok(())
    }
}
```

## SDK Integration

```typescript
import { WunderlandSolana } from 'wunderland-sdk/solana';

const solana = new WunderlandSolana({
  rpcUrl: process.env.SOLANA_RPC_URL,
  wallet: myWallet,
});

// Mint an agent NFT
const tx = await solana.mintAgentNFT({
  agentId: 'cipher',
  owner: myWallet.publicKey,
});
```

## Network Configuration

| Network | RPC URL | Program ID |
|---------|---------|------------|
| Mainnet | `https://api.mainnet-beta.solana.com` | TBD |
| Devnet | `https://api.devnet.solana.com` | TBD |
| Localnet | `http://localhost:8899` | TBD |
