# V-AXIS Delivery Handoff

Prepared for: Delivery and implementation team  
Project: V-AXIS multi-tenant document governance platform  
Repository: https://github.com/aboutony/v-axis  
Frontend: https://v-axis-web.vercel.app  
API: https://v-axis-api-v9yk.onrender.com  
Date: 2026-04-29

## 1. Executive Summary

V-AXIS is ready for delivery-team handoff after completion of the eight planned development phases. The platform now includes a production-minded monorepo, a preserved demo route, a real product frontend, a Fastify API, PostgreSQL persistence, Redis-backed worker automation, vault-style document storage, OCR/document intelligence foundations, tenant governance workflows, audit visibility, webhook automation, and a release-readiness QA gate.

The deployed topology is split by responsibility:

- Vercel hosts the React/Vite frontend.
- Render hosts the API service and worker service.
- Managed PostgreSQL stores platform data.
- Managed Redis backs BullMQ delivery and worker scheduling.
- Vault storage is configured through S3-compatible environment variables for production-style storage.

The final automated Phase 8 QA smoke passed against the deployed Render API and Vercel frontend origin.

## 2. Delivery Status

| Area | Status | Notes |
| --- | --- | --- |
| Source control | Ready | Repository remote is `aboutony/v-axis`. |
| Frontend deployment | Ready | Vercel project `v-axis-web`; production URL `https://v-axis-web.vercel.app`. |
| API deployment | Ready | Render service URL `https://v-axis-api-v9yk.onrender.com`. |
| Worker deployment | Ready | Render worker uses the same API build artifact and dedicated worker start command. |
| Database | Ready | PostgreSQL is connected and reported ready in Phase 8 smoke. |
| Redis | Ready | Required for queued delivery and scheduled automation. |
| Automated QA | Passed | Browser and production API smoke passed on 2026-04-29. |
| Manual production journeys | Pending customer/staging data | Required because these flows create or mutate live data. |

## 3. Implemented Phase Summary

### Phase 0 - Source Control And Deployment Baseline

- Established GitHub repository orientation.
- Added deployment guidance for Vercel and Render.
- Added Render blueprint configuration for API and worker.
- Added Vercel configuration for the frontend project.

### Phase 1 - Demo Preservation

- Preserved the demo experience as a dedicated route.
- Added automated demo checks.
- Protected the demo from production API/database dependency.

### Phase 2 - Real Product Frontend

- Added the real V-AXIS app route.
- Built product screens for bootstrap, workspace access, tenant administration, taxonomy, documents, audit, automation, and auth flows.
- Connected the frontend to the API client layer.

### Phase 3 - Production Backend Validation

- Added production API validation scripts and smoke tests.
- Hardened frontend origin handling.
- Verified health, docs, bootstrap readiness, CORS preflight, and protected endpoint behavior.

### Phase 4 - OCR And Document Intelligence

- Added OCR intelligence service foundations.
- Added document intelligence schema migration.
- Added document extraction, review, and approval-oriented flows.

### Phase 5 - Durable Vault Storage

- Added vault abstraction for local and S3-compatible storage.
- Added document upload/version handling.
- Added production environment hooks for vault storage.

### Phase 6 - Worker Automation And Notification Reliability

- Added Redis/BullMQ-backed worker processing.
- Added scheduled governance refresh and overdue escalation.
- Added delivery replay and automation visibility endpoints.

### Phase 7 - Security, Compliance, And Multitenant Hardening

- Added document access policy checks.
- Added security policy checks.
- Strengthened role/permission and tenant boundary behavior.
- Added audit and governance hardening.

### Phase 8 - End-To-End QA And Release Readiness

- Added browser QA across desktop and mobile routes.
- Added optional deployed API smoke when `VAXIS_API_BASE_URL` is provided.
- Documented manual production journeys and release readiness checklist.

## 4. Architecture Overview

### Monorepo Layout

| Path | Purpose |
| --- | --- |
| `apps/web` | React/Vite frontend, demo route, production app route, UI pages, API client. |
| `apps/api` | Fastify API, auth, tenant flows, document routes, automation routes, worker runtime. |
| `packages/db` | PostgreSQL schema, Drizzle migrations, database client. |
| `packages/domain` | Shared constants, roles, permissions, taxonomy, and domain utilities. |
| `docs` | Architecture decisions, deployment notes, roadmap, phase notes, handoff docs. |
| `scripts` | Release-readiness and production validation scripts. |

### Runtime Components

- Frontend: React, Vite, React Query, React Router.
- API: Fastify, Zod, JWT auth, bcrypt, otplib, QRCode.
- Worker: BullMQ, Redis, scheduled automation loops.
- Data: PostgreSQL, Drizzle ORM.
- Storage: Vault abstraction with local filesystem and S3-compatible configuration.
- Tooling: TypeScript, tsup, tsx, Vitest, Puppeteer.

## 5. Production URLs And Ownership

| Item | Value |
| --- | --- |
| GitHub repository | `https://github.com/aboutony/v-axis` |
| Vercel dashboard | `https://vercel.com/adonis-projects-7467a6ef` |
| Vercel production URL | `https://v-axis-web.vercel.app` |
| Render API dashboard | `https://dashboard.render.com/web/srv-d764nucr85hc739cbc8g/env` |
| Render API base URL | `https://v-axis-api-v9yk.onrender.com` |
| API docs | `https://v-axis-api-v9yk.onrender.com/docs` |
| API health | `https://v-axis-api-v9yk.onrender.com/health` |

## 6. Required Environment Variables

### Vercel Frontend

| Key | Required Value |
| --- | --- |
| `VITE_API_URL` | `https://v-axis-api-v9yk.onrender.com` |

### Render API And Worker

Set these on both API and worker services unless the value is API-only by business decision.

| Key | Purpose |
| --- | --- |
| `NODE_VERSION` | Node runtime version, expected `22`. |
| `NODE_ENV` | Production mode, expected `production`. |
| `DATABASE_URL` | Managed PostgreSQL connection string. |
| `REDIS_URL` | Managed Redis connection string. |
| `CORS_ORIGIN` | Trusted frontend origin, expected `https://v-axis-web.vercel.app`. |
| `TRUST_PROXY` | Reverse proxy trust, expected `true`. |
| `COOKIE_SECRET` | Strong random cookie signing secret. |
| `COOKIE_SAME_SITE` | Expected `none` for cross-site production cookies. |
| `COOKIE_SECURE` | Expected `true` in production. |
| `JWT_SECRET` | Strong random JWT signing secret. |
| `MFA_ENCRYPTION_SECRET` | Strong random encryption secret for MFA material. |
| `APP_ENCRYPTION_SECRET` | Strong random encryption secret for platform secrets. |
| `APP_BASE_URL` | Expected `https://v-axis-web.vercel.app`. |
| `WEBHOOK_TIMEOUT_MS` | Outbound webhook timeout, currently `5000`. |
| `EMAIL_TRANSPORT` | `JSON` for preview mode or `SMTP` for live mail. |
| `SMTP_HOST` | SMTP host when live email is enabled. |
| `SMTP_PORT` | SMTP port when live email is enabled. |
| `SMTP_SECURE` | SMTP TLS flag. |
| `SMTP_USER` | SMTP username. |
| `SMTP_PASSWORD` | SMTP password. |
| `EMAIL_FROM_ADDRESS` | Default sender address. |
| `EMAIL_FROM_NAME` | Default sender name. |
| `VAULT_STORAGE_DRIVER` | Expected `S3` for production-style storage. |
| `VAULT_STORAGE_ROOT` | Local fallback root if filesystem storage is used. |
| `VAULT_S3_BUCKET` | S3-compatible vault bucket. |
| `VAULT_S3_REGION` | S3-compatible vault region. |
| `VAULT_S3_ENDPOINT` | S3-compatible vault endpoint. |
| `VAULT_S3_ACCESS_KEY_ID` | S3-compatible access key. |
| `VAULT_S3_SECRET_ACCESS_KEY` | S3-compatible secret key. |
| `VAULT_S3_FORCE_PATH_STYLE` | Expected `true` for many S3-compatible providers. |
| `JOB_DELIVERY_MODE` | Expected `QUEUE` for production. |
| `WORKER_DELIVERY_CONCURRENCY` | Current default `5`. |
| `WORKER_GOVERNANCE_REFRESH_INTERVAL_MS` | Current default `900000`. |
| `WORKER_ESCALATION_INTERVAL_MS` | Current default `300000`. |

## 7. Deployment Commands

### Local Verification

```powershell
npm install
npm run typecheck
npm run test
npm run build
npm run test:demo
$env:VAXIS_API_BASE_URL="https://v-axis-api-v9yk.onrender.com"
$env:VAXIS_FRONTEND_ORIGIN="https://v-axis-web.vercel.app"
npm run phase8:qa
```

### Frontend Deployment

```powershell
npm exec --yes vercel -- --prod
```

The Vercel project is linked through `.vercel/project.json` as `v-axis-web`.

### Render Deployment

Render is configured through `render.yaml` for:

- `v-axis-api`
- `v-axis-worker`

With auto-deploy enabled, a push to the connected GitHub branch should trigger Render deployment. If auto-deploy is disabled or the dashboard requires confirmation, trigger a manual deploy from Render after pushing.

### Database Migration

Run migrations against the production database before customer use:

```powershell
npm run db:migrate
```

Only run this with `DATABASE_URL` set to the intended production database.

## 8. Validation Results

The Phase 8 release gate was run against the deployed API and frontend origin on 2026-04-29.

Validated:

- Demo route renders on desktop and mobile.
- Product `/app` route renders on desktop and mobile.
- Primary route buttons are visible and clickable.
- No unexpected browser console/page errors.
- No horizontal overflow on desktop or mobile.
- `/health` returns healthy.
- `/docs` is reachable.
- `/api/v1/platform/bootstrap` reports database readiness.
- CORS preflight allows `https://v-axis-web.vercel.app`.
- Protected endpoints reject unauthenticated access.

Observed platform state:

- Database ready: yes.
- Startup issue: none.
- Tenant count: zero at smoke-test time.

## 9. Manual Production Journey Checklist

These journeys intentionally remain manual because they create or mutate production data. Run them in a customer staging tenant first, then repeat in production with customer approval.

| Journey | Acceptance Signal |
| --- | --- |
| Tenant bootstrap | First tenant and admin are created successfully. |
| Login | Tenant admin can sign in and reaches workspace. |
| MFA enrollment | Admin can enroll and verify TOTP. |
| Invite acceptance | Invited user can accept invite and sign in. |
| Password reset | Reset link can be issued and completed. |
| Entity setup | Customer entities and category rules can be configured. |
| Document upload | Files upload, version, and appear in registry. |
| OCR extraction | OCR result is created and visible for review. |
| OCR approval | Reviewer can approve or correct extraction output. |
| Governance recalculation | Dashboard and risk summaries update after changes. |
| Notifications | Notifications can be created, acknowledged, escalated, and resolved. |
| Audit export | Audit records can be filtered and exported. |
| Webhook test | Signed webhook delivery can be sent and audited. |
| Worker replay | Failed email/webhook/OCR work can be replayed. |

## 10. Customer-Site Implementation Runbook

1. Confirm customer deployment model, data residency, identity requirements, email provider, storage provider, and support model.
2. Provision or confirm production PostgreSQL, Redis, S3-compatible storage, and SMTP provider.
3. Configure Render API and worker environment variables.
4. Run database migrations against the intended database.
5. Deploy API and worker, then verify `/health`, `/docs`, and bootstrap readiness.
6. Configure Vercel `VITE_API_URL` and deploy the frontend.
7. Confirm API CORS accepts only the intended customer frontend origin.
8. Bootstrap the first customer tenant with an approved admin account.
9. Complete MFA enrollment and verify access controls.
10. Configure customer entities, taxonomy, document rules, and notification policies.
11. Configure SMTP and webhook endpoints.
12. Upload pilot documents and validate OCR/review workflows.
13. Run the manual production journey checklist.
14. Train customer administrators and support team.
15. Capture sign-off and transition to support.

## 11. Security And Compliance Notes

- Do not store production secrets in Git.
- Rotate any secret that was shared outside the final production secret manager.
- Use strong random values for cookie, JWT, MFA, and app encryption secrets.
- Restrict CORS to approved frontend origins.
- Confirm customer requirements for retention, backup, audit export, and data residency.
- Confirm S3-compatible vault bucket permissions, encryption, retention, and lifecycle policies.
- Confirm SMTP domain authentication, sender policy, and production mail monitoring.
- Review audit logs after the first implementation run.

## 12. Known Constraints And Follow-Up Items

- Manual production journeys still require customer-approved test data.
- Email delivery is environment-dependent; production SMTP must be configured before live invite/reset testing.
- S3-compatible vault settings must be validated with an actual customer bucket.
- OCR quality depends on document type, scan quality, language, and customer review process.
- External identity provider integration is not included in the current phase scope.
- Formal penetration testing and customer compliance review should be scheduled before broad rollout.

## 13. Handoff Package Contents

| Artifact | Path |
| --- | --- |
| Delivery handoff Markdown | `docs/handoff/v-axis-delivery-handoff.md` |
| Delivery handoff HTML | `docs/handoff/v-axis-delivery-handoff.html` |
| Delivery handoff DOCX | `docs/handoff/v-axis-delivery-handoff.docx` |
| Delivery team skills Markdown | `docs/handoff/v-axis-delivery-team-skills.md` |
| Delivery team skills HTML | `docs/handoff/v-axis-delivery-team-skills.html` |
| Delivery team skills DOCX | `docs/handoff/v-axis-delivery-team-skills.docx` |

## 14. Final Handoff Statement

V-AXIS is ready for delivery-team implementation planning. The platform has a working deployment topology, an automated release-readiness gate, core tenant/document/governance workflows, production deployment configuration, and customer-site implementation documentation. The delivery team should now validate customer-specific infrastructure, configure final secrets, run production migrations, execute the manual journey checklist, and obtain customer sign-off.
