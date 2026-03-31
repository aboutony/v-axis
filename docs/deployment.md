# Deployment Guide

V-AXIS is currently designed for a split deployment:

- `apps/web` on Vercel
- `apps/api` on a persistent Node host
- `apps/api` worker on a separate persistent worker service
- managed PostgreSQL and Redis

Do not deploy `apps/api` directly to Vercel in its current form. The API depends on a separate BullMQ worker and uses local vault storage by default.

## Recommended Topology

- Frontend: Vercel
- API: Render or Railway
- Worker: Render worker or Railway worker
- Database: managed PostgreSQL
- Queue: managed Redis

## Frontend on Vercel

- Project root: `apps/web`
- Framework preset: `Vite`
- Config file: `apps/web/vercel.json`

Required Vercel environment variables:

- `VITE_API_URL=https://your-api-domain`

The Vercel config handles:

- workspace-aware install from the monorepo root
- workspace-aware frontend build
- SPA rewrites back to `index.html`

## Backend on Render

The repository now includes `render.yaml` for:

- `v-axis-api`
- `v-axis-worker`

Required backend environment variables:

- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGIN=https://your-vercel-domain`
- `COOKIE_SECRET`
- `JWT_SECRET`
- `MFA_ENCRYPTION_SECRET`
- `APP_ENCRYPTION_SECRET`
- `APP_BASE_URL=https://your-vercel-domain`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `VAULT_STORAGE_ROOT`

Recommended backend production values:

- `NODE_ENV=production`
- `TRUST_PROXY=true`
- `COOKIE_SAME_SITE=none`
- `COOKIE_SECURE=true`
- `JOB_DELIVERY_MODE=QUEUE`

## Railway Commands

If you prefer Railway over Render, use these commands:

- API build: `npm install && npm run build -w @vaxis/api`
- API start: `npm run start -w @vaxis/api`
- Worker build: `npm install && npm run build -w @vaxis/api`
- Worker start: `npm run start:worker -w @vaxis/api`

Use the same environment variables listed above.

## Migrations

Before using the deployed API, apply migrations against the production database:

```powershell
npm install
npm run db:migrate
```

If your host supports one-off commands or shell access, run migrations there after `DATABASE_URL` is configured.

## Storage Note

The current vault implementation stores files on the local filesystem using `VAULT_STORAGE_ROOT`. That is acceptable for local development and limited staging, but it is not the final production storage model.

For production readiness, use one of these approaches:

- mount a persistent disk and point `VAULT_STORAGE_ROOT` to it
- add object storage integration and move the vault to S3-compatible storage

## Launch Order

1. Provision PostgreSQL.
2. Provision Redis.
3. Deploy the API service.
4. Run database migrations.
5. Deploy the worker service.
6. Deploy the Vercel frontend with `VITE_API_URL` pointed at the API.
7. Set `CORS_ORIGIN` and `APP_BASE_URL` to the final frontend URL.
8. Test login, webhook delivery, email delivery, and worker automation from the live environment.
