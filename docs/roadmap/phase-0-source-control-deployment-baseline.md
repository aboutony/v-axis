# V-AXIS Phase 0 - Source Control And Deployment Baseline

Date: April 28, 2026

Status: In progress. Public and repository-verifiable items are mapped. Render dashboard-only service ownership still requires Render dashboard/API confirmation.

## UI/UX Preservation Rule

The current V-AXIS demo UI/UX is a protected baseline. Development work must not overwrite, simplify, or destabilize the demo experience.

Required controls:

- Keep the current demo journey intact until a dedicated demo route or deployment is created.
- Treat UI/UX changes to the demo as approval-required changes.
- Add demo clickability and visual regression checks before product frontend refactoring.
- Develop the real product frontend separately from the protected demo entry point.
- Do not connect the demo to production writes.

## Verified GitHub Baseline

Repository:

- GitHub: `https://github.com/aboutony/v-axis`
- Repository full name: `aboutony/v-axis`
- Visibility: public
- Default branch: `main`
- Local remote: `origin https://github.com/aboutony/v-axis.git`
- Local branch: `main`
- Remote tracking: `main...origin/main`
- Latest verified commit: `53f85444f20d211bd5f3bfc3af25ac7e8b693796`
- Commit summary: `53f8544 Add multi-channel alert center`
- Commit date: April 23, 2026, 10:35:58 +0300
- Open branches found remotely: `main`
- GitHub connector permissions: admin, maintain, pull, push, triage

Working tree note:

- `docs/roadmap/` contains new local roadmap/baseline documents not yet committed.
- No application source files were changed during Phase 0 documentation.

## Verified Vercel Baseline

Project:

- Vercel project name: `v-axis-web`
- Vercel project ID: `prj_tkrbOjbLoklvBLhLF4ydo8Y7QFmw`
- Vercel org/team ID: `team_XrjHAzT1FpZODCyW7RLfeVlm`
- Vercel dashboard: `https://vercel.com/adonis-projects-7467a6ef/v-axis-web`
- Production alias: `https://v-axis-web.vercel.app`

Deployment:

- Deployment ID: `dpl_A9hPKwDcHKzoyPD69TLc4vjfHzg6`
- Deployment URL: `https://v-axis-hpxm15ob8-adonis-projects-7467a6ef.vercel.app`
- Target: production
- Status: Ready
- Created: April 23, 2026, 10:36:08 GMT+0300
- Aliases:
  - `https://v-axis-web.vercel.app`
  - `https://v-axis-web-adonis-projects-7467a6ef.vercel.app`
  - `https://v-axis-web-git-main-adonis-projects-7467a6ef.vercel.app`

Environment variables:

- `VITE_API_URL` exists in Production, Preview, and Development.
- Value is encrypted in Vercel and was not exposed.

Configuration files:

- Root `vercel.json` builds `apps/web` output from monorepo root.
- `apps/web/vercel.json` also exists and is workspace-aware if Vercel project root is set to `apps/web`.

Current assessment:

- Vercel is mapped and active.
- Vercel production is associated with the `main` Git alias.
- The deployed frontend is currently the protected demo-style UI, not the finished real product frontend.

## Verified Render Baseline

Provided Render dashboard links:

- Worker: `https://dashboard.render.com/worker/srv-d764nucr85hc739cbc90`
- Web: `https://dashboard.render.com/web/srv-d764nucr85hc739cbc8g`
- Web: `https://dashboard.render.com/web/srv-d763aevpm1nc73covml0`

Repository configuration in `render.yaml` defines two services:

1. `v-axis-api`
   - Type: web
   - Region: Frankfurt
   - Root directory: `.`
   - Auto-deploy: true
   - Build command: `npm install --include=dev && npm run build -w @vaxis/api`
   - Start command: `npm run start -w @vaxis/api`
   - Health check path: `/health`

2. `v-axis-worker`
   - Type: worker
   - Region: Frankfurt
   - Root directory: `.`
   - Auto-deploy: true
   - Build command: `npm install --include=dev && npm run build -w @vaxis/api`
   - Start command: `npm run start:worker -w @vaxis/api`

Public endpoint checks:

- `https://v-axis-api.onrender.com/health`
  - Status: 200
  - Service: `V-AXIS API`
  - Environment: production
- `https://v-axis-api.onrender.com/api/v1/platform/bootstrap`
  - Status: 200
  - `databaseReady: false`
  - Startup issue: `The production database schema has not been initialized yet.`
- `https://v-axis-worker.onrender.com/health`
  - Status: 404
  - Interpretation: expected for a Render worker if no public HTTP service exists.
- `https://v-axis-web.onrender.com/health`
  - Status: 404
- `https://v-axis.onrender.com/health`
  - Status: 404

Current assessment:

- The API service is publicly reachable and likely corresponds to the intended `v-axis-api` Render web service.
- The worker service is defined in `render.yaml`, but cannot be confirmed from a public health URL because Render workers do not expose HTTP endpoints.
- The third Render dashboard web service is not represented in `render.yaml` and remains unresolved.
- Render API credentials are not available locally as `RENDER_API_KEY` or `RENDER_TOKEN`, so dashboard service IDs cannot be conclusively mapped from the terminal.

## Render Mismatch Resolution

Current mismatch:

- `render.yaml` defines two services: one web API and one worker.
- The provided dashboard links include three services: one worker and two web services.

Most likely mapping:

| Dashboard service ID | Dashboard type | Likely role | Evidence | Status |
| --- | --- | --- | --- | --- |
| `srv-d764nucr85hc739cbc90` | worker | `v-axis-worker` | Type matches `render.yaml` worker service | Needs dashboard/API confirmation |
| `srv-d764nucr85hc739cbc8g` | web | `v-axis-api` | Type matches `render.yaml` web service and ID is adjacent to worker ID | Needs dashboard/API confirmation |
| `srv-d763aevpm1nc73covml0` | web | Unknown, possibly legacy/manual web service | Not represented in `render.yaml`; no confirmed public health URL | Must be reviewed |

Required resolution action:

- Open Render dashboard and confirm each service name, connected repo, branch, build command, start command, auto-deploy setting, and environment variables.
- If `srv-d763aevpm1nc73covml0` is obsolete, disable auto-deploy and mark it as legacy, or delete it after backup.
- If it is required, add it explicitly to deployment documentation and explain its purpose.
- If it is a second API or frontend service, decide whether it belongs to Demo, Real Product, staging, or legacy.

## Branch And Auto-Deploy Policy

Current state:

- Only `main` is visible remotely.
- Vercel production is aliased to the `main` deployment.
- Render services in `render.yaml` have `autoDeploy: true`.

Immediate policy:

- `main` remains the current production/demo baseline until environment separation is implemented.
- Do not directly overwrite the demo UI on `main` without a protected demo route or deployment.
- Use pull requests for all product frontend and backend changes.
- Run build, tests, and demo clickability checks before merge.
- Do not change Vercel or Render environment variables without recording the change in this baseline document or a deployment log.

Recommended target policy:

- `main`: production-ready code after review.
- `demo-stable`: protected demo baseline, deployed to demo route or demo Vercel project.
- `develop` or feature branches: product development work.
- Vercel production: deploy from `main`.
- Vercel demo: deploy from `demo-stable` or route `/demo` from protected code.
- Render API and worker: deploy from `main` after backend checks pass.
- Any staging Render services: deploy from `develop` or a dedicated staging branch.

## Environment Variable Policy

### Vercel

Required:

- `VITE_API_URL`

Policy:

- Production value must point to the active Render API base URL.
- Preview and development values may point to staging/local APIs.
- Values are encrypted and should not be copied into documents.

### Render API

Required:

- `NODE_VERSION`
- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGIN`
- `TRUST_PROXY`
- `COOKIE_SECRET`
- `COOKIE_SAME_SITE`
- `COOKIE_SECURE`
- `JWT_SECRET`
- `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` if RS256 is adopted
- `MFA_ENCRYPTION_SECRET`
- `APP_ENCRYPTION_SECRET`
- `APP_BASE_URL`
- `WEBHOOK_TIMEOUT_MS`
- `EMAIL_TRANSPORT`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `VAULT_STORAGE_ROOT`
- `JOB_DELIVERY_MODE`

Policy:

- Secrets stay in Render/Vercel secret stores only.
- `CORS_ORIGIN` must include only trusted frontend origins.
- `APP_BASE_URL` must match the current real product frontend origin.
- Demo origin and production origin should be documented separately once split.

### Render Worker

Required:

- Same core backend secrets as the API.
- `DATABASE_URL`
- `REDIS_URL`
- Worker interval and concurrency variables.

Policy:

- Worker must share database and Redis with the matching API environment.
- Worker must not point to a different database than the API.
- Queue health must be visible through API automation status or Render logs.

## Health Check Policy

GitHub:

- Confirm `main` commit and PR status before deployments.

Vercel:

- Confirm production deployment status is Ready.
- Confirm `https://v-axis-web.vercel.app` returns 200.
- Run demo UI clickability check before and after product UI changes.

Render API:

- Confirm `/health` returns 200.
- Confirm `/api/v1/platform/bootstrap` reports `databaseReady: true` after migrations.
- Confirm `/docs` loads.

Render worker:

- Confirm worker status in Render dashboard or Render API.
- Confirm worker logs show online status.
- Confirm queue-backed jobs are processed through `/api/v1/automation` after authentication.

Third Render service:

- Confirm whether it is active, legacy, staging, duplicate API, or another frontend.
- Document final decision before Phase 1 begins.

## Phase 0 Open Items

- [x] GitHub repository mapped.
- [x] Vercel project mapped.
- [x] Vercel production deployment mapped.
- [x] Vercel `VITE_API_URL` presence confirmed.
- [x] Render API public health confirmed.
- [x] Render production database initialization issue confirmed.
- [ ] Render dashboard IDs mapped conclusively to service names.
- [ ] Third Render web service purpose resolved.
- [ ] Render worker dashboard/log status confirmed.
- [ ] Production database migrations applied.
- [x] Demo route protection implemented at `/demo`.
- [x] UI/UX regression checks added to the repo.

## Immediate Next Actions

1. In Render dashboard, inspect the three provided service IDs and record service name, repo, branch, build command, start command, and auto-deploy setting.
2. Decide whether the third Render web service is legacy, staging, duplicate, or required.
3. Apply production database migrations for the active API database.
4. Add a protected demo route/deployment before refactoring the real product frontend.
5. Add automated UI/UX checks for the protected demo baseline.
