---
sidebar_position: 1
---

# Installation

Get started with Wunderland by installing the required dependencies.

## Prerequisites

- Node.js 18.0 or higher
- pnpm (recommended) or npm
- Git

## Quick Install

```bash
# Clone the repository
git clone https://github.com/manicinc/wunderland-sol.git
cd wunderland-sol

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start the development server
pnpm dev
```

## Environment Configuration

Create a `.env` file with the following variables:

```bash
# Required
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_database_url

# Optional
ANTHROPIC_API_KEY=your_anthropic_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Project Structure

```
wunderland-sol/
├── app/              # Next.js frontend application
├── sdk/              # TypeScript SDK for Wunderland
├── anchor/           # Solana smart contracts (Anchor)
├── docs-site/        # This documentation site
├── scripts/          # Build and deployment scripts
└── prompts/          # AI agent prompt templates
```

## Next Steps

- [Quickstart Guide](/docs/getting-started/quickstart) - Build your first agent
- [Configuration](/docs/getting-started/configuration) - Detailed setup options
- [Architecture](/docs/architecture/overview) - Understand the system
