# V-AXIS Platform Foundation

V-AXIS is a multi-tenant governance platform for high-trust document operations across holding groups, subsidiaries, and regulated business units. This repository now contains the first production-minded foundation for the platform, built entirely on free and open-source tooling.

## What Is In Place

- Monorepo structure with `apps/web`, `apps/api`, `packages/domain`, and `packages/db`
- Shared domain package for roles, permissions, document taxonomy, and DNA-code utilities
- PostgreSQL schema for tenants, users, taxonomy, documents, sessions, notifications, audit logs, risk scores, connectors, and webhooks
- Fastify API with OpenAPI docs, tenant bootstrap, JWT sessions, TOTP MFA enrollment and enforcement, taxonomy controls, governance routes, and vault-style document upload/version endpoints
- React/Vite command-center shell with a real bootstrap form, tenant workspace, MFA setup, taxonomy controls, document registration, file uploads, dashboard views, rules management, and actionable notifications
- Docker Compose stack for PostgreSQL, Redis, and Mailpit

## Stack

- Frontend: React, Vite, React Query, React Router
- Backend: Fastify, Zod, JWT auth, bcrypt, otplib, QRCode
- Data: PostgreSQL, Drizzle ORM, Drizzle Kit
- Tooling: TypeScript, tsup, tsx, Vitest, Docker Compose

## Quick Start

1. Copy the environment templates.

```powershell
Copy-Item .env.example .env
Copy-Item apps\web\.env.example apps\web\.env
```

2. Start local infrastructure.

```powershell
docker compose up -d
```

3. Install dependencies.

```powershell
npm install
```

4. Generate migrations and apply them.

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Start the API and web app.

```powershell
npm run dev
```

6. Open the apps.

- Web UI: `http://localhost:5173`
- API docs: `http://localhost:4000/docs`
- Mailpit: `http://localhost:8025`

## Environment Notes

- `MFA_ENCRYPTION_SECRET` protects stored TOTP secrets. Replace it before any shared or production deployment.
- `VAULT_STORAGE_ROOT` controls the local filesystem vault path. The default is `.data/vault`, which is ignored by git.
- Docker is still required for live Postgres verification unless you point `DATABASE_URL` at another PostgreSQL instance.

## Current Priority Path

1. Bootstrap the first client tenant from the Launchpad screen.
2. Sign into the Workspace screen with the new tenant admin.
3. Complete MFA setup for the tenant admin on first login.
4. Rename category slots, add entities, and register or upload seeded documents.
5. Define entity document rules, review the generated notification queue, and upload replacement versions where needed.
6. Verify dashboard summaries and risk scoring against live database data.

## Repo Notes

- The original business and solution documents remain in the repository root as source material.
- Architecture decisions are captured under [docs/adr](docs/adr).
- The current implementation intentionally favors a clean control plane and product contracts over premature connector complexity.
