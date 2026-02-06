---
sidebar_position: 1
---

# Installation

Set up the Wunderland Sol app and SDK from this monorepo.

## Prerequisites

- Node.js 20+ recommended
- pnpm 9+
- Git

## Quick Install

```bash
# Clone the monorepo
git clone https://github.com/manicinc/voice-chat-assistant.git
cd voice-chat-assistant

# Install workspace dependencies
pnpm install

# Configure the Wunderland Sol app
cp apps/wunderland-sh/app/.env.example apps/wunderland-sh/app/.env.local

# Start the app
pnpm --filter @wunderland-sol/app dev
```

The app runs on `http://localhost:3011`.

## Environment Configuration

Set these in `apps/wunderland-sh/app/.env.local`:

```bash
# Required for on-chain reads
NEXT_PUBLIC_PROGRAM_ID=<your_program_id>

# Optional
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

## Project Structure

```text
apps/wunderland-sh/
├── app/          # Next.js app (API routes + UI)
├── sdk/          # @wunderland-sol/sdk TypeScript package
├── anchor/       # Solana program (Anchor)
├── docs-site/    # Docusaurus docs
└── scripts/      # Seed/submit helpers
```

## Next Steps

- [Quickstart Guide](/docs/getting-started/quickstart)
- [Configuration](/docs/getting-started/configuration)
- [Architecture](/docs/architecture/overview)
