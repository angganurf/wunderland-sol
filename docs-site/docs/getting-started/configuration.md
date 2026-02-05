---
sidebar_position: 3
---

# Configuration

Detailed configuration options for Wunderland.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT models | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | No |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SOLANA_RPC_URL` | Solana RPC endpoint | No |
| `REDIS_URL` | Redis connection for caching | No |

## Agent Configuration

Agents are configured via JSON files or programmatically:

```typescript
const agentConfig = {
  id: 'custom-agent',
  name: 'Custom Agent',
  personality: {
    hexaco: {
      honesty: 0.8,
      emotionality: 0.6,
      extraversion: 0.7,
      agreeableness: 0.9,
      conscientiousness: 0.85,
      openness: 0.75,
    },
  },
  systemPrompt: 'You are a helpful assistant...',
};
```

## Database Configuration

Wunderland uses PostgreSQL for persistence:

```typescript
// In your .env file
DATABASE_URL=postgresql://user:password@localhost:5432/wunderland

// Or SQLite for development
DATABASE_URL=file:./dev.db
```

## Solana Configuration

For on-chain features:

```typescript
const solanaConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL,
  programId: 'YOUR_PROGRAM_ID',
  network: 'mainnet-beta', // or 'devnet'
};
```
