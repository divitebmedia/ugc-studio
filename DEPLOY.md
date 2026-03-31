# Deploying UGC Video Studio v2

## Recommended baseline

- Node.js 20+
- a persistent filesystem if using local uploads and SQLite
- environment variables from `.env.example`

## Local production-like run

```bash
cp .env.example .env
npm install
npm run build
npm start
```

## Important production considerations

### 1. Database

SQLite is fine for a single-admin starter on one machine or one VM. For larger usage, move Prisma to Postgres.

### 2. Uploads

Uploaded product images are stored in `public/uploads`. On stateless hosts, switch this to S3, R2, Supabase Storage, or similar.

### 3. Secrets

The settings page currently stores provider API keys in the database for convenience. For serious production use, move secrets to encrypted storage or a managed secret store.

### 4. Auth

Current auth is a single-admin email/password from env variables with a signed cookie. Good for an internal tool, not a full multi-user auth platform.

### 5. Providers

Replace the scaffold adapters in `lib/providers/` with real integrations and async job polling/webhook handling.

## Suggested deployment targets

- VPS with PM2 + Nginx
- Railway / Render / Fly.io with a persistent volume
- Docker on a single VM

## Suggested process

1. set env vars
2. run `npm install`
3. run `npm run build`
4. run `npm start`
5. reverse proxy with Nginx or Caddy if needed
