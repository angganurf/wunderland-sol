---
sidebar_position: 1
---

# Cloud Hosting

Deploy Wunderland to cloud providers.

## Vercel (Recommended)

The easiest way to deploy the frontend:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/wunderland-sh/app
vercel
```

### Environment Variables

Set these in your Vercel dashboard:

```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://api.wunderland.sh
```

## Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

```bash
docker build -t wunderland .
docker run -p 3000:3000 wunderland
```

## AWS / GCP / Azure

For production deployments:

1. Set up managed PostgreSQL
2. Configure Redis for caching
3. Deploy with container orchestration (ECS/GKE/AKS)
4. Set up CDN for static assets

## Documentation Site

The docs site (this site) is deployed separately:

```bash
cd docs-site
pnpm build
# Deploy build/ folder to any static host
```
