# UGC Video Studio v2

A self-contained Next.js + Prisma app-router starter for generating TikTok-style UGC video workflows.

## What it includes

- Next.js app router + TypeScript
- simple single-admin auth flow using `ADMIN_EMAIL` + `ADMIN_PASSWORD`
- Prisma schema for `users`, `appSettings`, `products`, `assets`, and `jobs`
- settings page for provider names, API keys, and model names
- product upload flow with local image storage in `public/uploads`
- script generation flow using a mock text adapter scaffold
- image generation adapter scaffold
- video generation adapter scaffold
- job history UI
- SQLite for quick local setup

## Quick start

```bash
cp .env.example .env
npm install
npm run build
npm run dev
```

Open `http://localhost:3000` and sign in with the admin credentials from `.env`.

## Environment

See `.env.example` for the required variables.

## Main routes

- `/login` — admin sign-in
- `/dashboard` — overview
- `/products` — list products
- `/products/new` — create product + upload image
- `/products/[id]` — generate script/image/video job scaffolds
- `/settings` — provider config
- `/jobs` — full job history

## Notes on provider adapters

The current adapters are intentionally scaffolded and safe-by-default:

- `lib/providers/text.ts`
- `lib/providers/image.ts`
- `lib/providers/video.ts`

They create realistic prompts and payloads without calling external APIs. Swap these files with real provider calls when ready.

## Database

Prisma uses SQLite by default:

- schema: `prisma/schema.prisma`
- local db: `prisma/dev.db`

To refresh locally:

```bash
npx prisma db push
```

## Production notes

- move stored API keys to encrypted secrets or a managed secret store before exposing publicly
- replace the simple single-admin cookie auth with a proper auth solution if you need teams or internet-facing auth hardening
- wire async workers/webhooks for real video job polling
- use object storage for uploads instead of local disk on stateless hosts

More deployment detail is in `DEPLOY.md`.
