# V-AXIS Platform Foundation

V-AXIS is a multi-tenant governance platform for high-trust document operations across holding groups, subsidiaries, and regulated business units. This repository now contains the first production-minded foundation for the platform, built entirely on free and open-source tooling.

## What Is In Place

- Monorepo structure with `apps/web`, `apps/api`, `packages/domain`, and `packages/db`
- Shared domain package for roles, permissions, document taxonomy, and DNA-code utilities
- PostgreSQL schema for tenants, users, taxonomy, documents, sessions, notifications, audit logs, risk scores, connectors, and webhooks
- Fastify API with OpenAPI docs, tenant bootstrap, JWT sessions, TOTP MFA enrollment and enforcement, invite and reset links, tenant-managed email connectors, taxonomy controls, user administration, governance routes, escalation workflows, audit exploration, managed webhooks, and vault-style document upload/version endpoints
- React/Vite command-center shell with a real bootstrap form, tenant workspace, MFA setup, invite/reset access flow, email connector controls, taxonomy controls, user ownership management, document registration, file uploads, dashboard views, audit visibility, webhook controls, and actionable notifications
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
- `APP_ENCRYPTION_SECRET` protects other platform secrets such as outbound webhook shared secrets. If omitted, it falls back to `MFA_ENCRYPTION_SECRET`.
- `APP_BASE_URL` controls the access-link destination used for invite and password-reset links.
- `VAULT_STORAGE_ROOT` controls the local filesystem vault path. The default is `.data/vault`, which is ignored by git.
- `WEBHOOK_TIMEOUT_MS` controls the outbound delivery timeout for webhook attempts.
- `EMAIL_TRANSPORT` can be `SMTP` for Mailpit/SMTP delivery or `JSON` for transport-free local preview mode.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD` control outbound email delivery.
- `EMAIL_FROM_ADDRESS` and `EMAIL_FROM_NAME` set the platform sender defaults used by notification connectors.
- Docker is still required for live Postgres verification unless you point `DATABASE_URL` at another PostgreSQL instance.

## Current Priority Path

1. Bootstrap the first client tenant from the Launchpad screen.
2. Sign into the Workspace screen with the new tenant admin.
3. Complete MFA setup for the tenant admin on first login.
4. Rename category slots, add entities, and register or upload seeded documents.
5. Create tenant users, leave passwords blank when desired, and issue invite links from the workspace.
6. Define entity document rules, review the generated notification queue, and escalate overdue work where needed.
7. Configure email connectors for Mailpit/SMTP delivery, then issue invite or reset links and test a notification send.
8. Configure signed webhooks for outbound alert delivery and review the audit explorer.
9. Verify dashboard summaries and risk scoring against live database data.

## Repo Notes

- The original business and solution documents remain in the repository root as source material.
- Architecture decisions are captured under [docs/adr](docs/adr).
- The current implementation intentionally favors a clean control plane and product contracts over premature connector complexity.
