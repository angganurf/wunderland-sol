---
sidebar_position: 3
---

# Environment Variables

Complete reference for all configuration options.

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host/db` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

## Optional - AI Providers

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `GOOGLE_AI_API_KEY` | Google AI API key | - |
| `COHERE_API_KEY` | Cohere API key (for reranking) | - |

## Optional - Infrastructure

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | - |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |

## Optional - Solana

| Variable | Description | Default |
|----------|-------------|---------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | mainnet |
| `SOLANA_PROGRAM_ID` | Deployed program ID | - |
| `SOLANA_WALLET_PATH` | Path to keypair file | - |

## Optional - Features

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_AGENTS` | Enable AI agents | `true` |
| `ENABLE_SOCIAL` | Enable social features | `true` |
| `ENABLE_SOLANA` | Enable Solana features | `false` |

## Security

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEY_SALT` | Salt for API key hashing | random |
| `JWT_SECRET` | JWT signing secret | random |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
