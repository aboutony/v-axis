# V-AXIS Phase 3 - Production Backend Initialization And Validation

Date: April 28, 2026

Status: Database initialization completed on the Frankfurt Render service. Remaining checks are Redis/worker validation and optional tenant bootstrap.

## Current Production Findings

Production API originally checked:

- Base URL checked: `https://v-axis-api.onrender.com`
- `/health`: 200 OK
- `/docs`: 200 OK
- `/api/v1/platform/bootstrap`: 200 OK
- Current platform state: `databaseReady: false`
- Startup issue: `The production database schema has not been initialized yet.`

Correct active Frankfurt API:

- Base URL checked: `https://v-axis-api-v9yk.onrender.com`
- `/health`: 200 OK
- `/docs`: 200 OK
- `/api/v1/platform/bootstrap`: 200 OK
- Current platform state: `databaseReady: true`
- Startup issue: `null`

CORS:

- Preflight checked from `https://v-axis-web.vercel.app`
- `OPTIONS /api/v1/auth/login`: 204
- `access-control-allow-origin`: `https://v-axis-web.vercel.app`
- `access-control-allow-credentials`: `true`
- Current CORS behavior is healthy for the Vercel production origin.

Credentials unavailable locally:

- `RENDER_API_KEY`: missing
- `RENDER_TOKEN`: missing
- `DATABASE_URL`: missing
- `REDIS_URL`: missing

Because of that, I did not run production migrations directly from this workstation. The user ran migrations and seed successfully from the Render shell attached to the Frankfurt service environment.

## Migration Result

Completed on Render:

```bash
npm run db:migrate
npm run db:seed
```

Observed result:

- Database connection test succeeded as `vaxis_user` against database `vaxis`.
- Drizzle migrations applied successfully.
- Seed inserted 19 system document types.
- `https://v-axis-api-v9yk.onrender.com/api/v1/platform/bootstrap` now reports `databaseReady: true`.

Important environment finding:

- `v-axis-db` is in Frankfurt (EU Central).
- `v-axis-api-v9yk` is in Frankfurt and can resolve the internal database URL.
- `v-axis-api` is in Oregon (US West) and cannot resolve the Frankfurt internal database URL.
- The active product API should be the Frankfurt API, or the Oregon service should be retired/disabled to avoid confusion.

## Production Migration Run Order

Run these commands in the active Render API service shell, or locally only after explicitly setting `DATABASE_URL` to the production PostgreSQL connection string.

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run phase3:validate
```

If running locally against production:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:REDIS_URL="redis://..."
$env:VAXIS_API_BASE_URL="https://v-axis-api.onrender.com"
$env:VAXIS_FRONTEND_ORIGIN="https://v-axis-web.vercel.app"
npm run db:migrate
npm run db:seed
npm run phase3:validate
```

Tenant bootstrap validation is intentionally opt-in because it writes a real tenant. To run it after confirming the database is ready:

```powershell
$env:VAXIS_RUN_TENANT_BOOTSTRAP="true"
npm run phase3:validate
```

## Seed Data Strategy

The current seed strategy is intentionally conservative:

- Migrations create the database schema.
- `npm run db:seed` runs `packages/db/src/seed.ts`.
- The seed inserts system document types from `@vaxis/domain`.
- The seed is idempotent: it checks for an existing system document type by code where `tenantId` is null before inserting.
- Tenant-specific seed data is not inserted globally.
- Tenant bootstrap creates tenant data through the API:
  - Tenant row
  - Client admin user
  - Eight default category slots
  - Tenant bootstrap audit log

This strategy is healthy for production because it avoids overwriting demo data or creating fake tenant records in the real product database.

## Redis And Worker Connectivity Strategy

Direct Redis validation requires `REDIS_URL`.

The added validation script supports Redis ping when `REDIS_URL` is available:

```powershell
$env:REDIS_URL="redis://..."
npm run phase3:validate
```

Worker validation requires one of:

- Render dashboard/log inspection for `v-axis-worker`.
- Render API access.
- Authenticated `/api/v1/automation` check after tenant bootstrap and login.

Current public check note:

- `https://v-axis-worker.onrender.com/health` returns 404, which is expected for a Render worker because it does not expose a public HTTP server.

## Session Cookie, CORS, And Frontend Origin Validation

Confirmed:

- CORS preflight accepts `https://v-axis-web.vercel.app`.
- CORS allows credentials.
- Backend origin collection code includes both `CORS_ORIGIN` and `APP_BASE_URL`.
- Invite and reset link generation can prefer the current trusted frontend origin and fall back to `APP_BASE_URL`.

Still to validate after database migration:

- Login returns refresh cookie with production cookie policy.
- `COOKIE_SAME_SITE=none` works with Vercel frontend.
- `COOKIE_SECURE=true` is active in production.
- Refresh session works from Vercel frontend.
- Logout clears session cookie.

## Added Validation Script

Created:

- `scripts/phase3-validate-production.mjs`

Root command:

```powershell
npm run phase3:validate
```

The script checks:

- API health
- API docs
- Platform bootstrap state
- CORS preflight from Vercel
- Redis ping when `REDIS_URL` is provided
- Optional tenant bootstrap when `VAXIS_RUN_TENANT_BOOTSTRAP=true`

Current result:

- The script passes against `https://v-axis-api-v9yk.onrender.com`.
- Redis check is skipped unless `REDIS_URL` is supplied to the validation environment.
- Tenant bootstrap check is skipped unless `VAXIS_RUN_TENANT_BOOTSTRAP=true`.

## Acceptance Criteria

- [x] Production migrations applied.
- [x] `npm run db:seed` completed against production database.
- [x] `/api/v1/platform/bootstrap` returns `databaseReady: true` on `https://v-axis-api-v9yk.onrender.com`.
- [x] `npm run phase3:validate` passes against `https://v-axis-api-v9yk.onrender.com`.
- [ ] Redis ping passes with production `REDIS_URL`.
- [ ] Render worker logs confirm online worker with Redis.
- [ ] Tenant bootstrap succeeds in production or staging validation environment.
- [ ] Login, refresh, logout, and MFA setup are validated from Vercel frontend.
