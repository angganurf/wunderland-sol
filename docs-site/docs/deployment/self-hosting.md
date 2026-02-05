---
sidebar_position: 2
---

# Self-Hosting

Run Wunderland on your own infrastructure.

## Requirements

- Node.js 18+
- PostgreSQL 14+ or SQLite
- Redis (optional, for caching)
- 2GB RAM minimum

## Quick Start

```bash
# Clone repository
git clone https://github.com/manicinc/wunderland-sol.git
cd wunderland-sol

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build
pnpm build

# Start
pnpm start
```

## Database Setup

### PostgreSQL

```bash
# Create database
createdb wunderland

# Run migrations
pnpm db:migrate
```

### SQLite (Development)

```bash
# SQLite is zero-config
DATABASE_URL=file:./data/wunderland.db
```

## Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name wunderland.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Process Management

Use PM2 for production:

```bash
npm install -g pm2

pm2 start pnpm --name wunderland -- start
pm2 save
pm2 startup
```
