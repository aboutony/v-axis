# Phase 8 - End-To-End QA And Release Readiness

Status: Implemented baseline release gate.

## Automated Release Gate

Command:

```text
npm run phase8:qa
```

The automated gate validates:

- Demo route renders on desktop and mobile.
- Demo primary buttons are visible and clickable.
- Real product `/app` route renders on desktop and mobile.
- Real product primary buttons are visible and clickable.
- No unexpected browser console/page errors.
- No horizontal overflow on desktop or mobile.
- Optional deployed API smoke checks when `VAXIS_API_BASE_URL` is provided:
  - `/health`
  - `/docs`
  - `/api/v1/platform/bootstrap`
  - CORS preflight for the configured frontend origin
  - Protected endpoints reject unauthenticated access

Production API example:

```text
$env:VAXIS_API_BASE_URL="https://v-axis-api-v9yk.onrender.com"
$env:VAXIS_FRONTEND_ORIGIN="https://v-axis-web.vercel.app"
npm run phase8:qa
```

## Manual Production Journey Checklist

These actions create or mutate production data, so they remain manual until a dedicated staging tenant exists:

- Tenant bootstrap.
- Login.
- MFA enrollment and verification.
- Invite issue and acceptance.
- Password reset issue and completion.
- Entity/category setup.
- Document upload.
- OCR extraction.
- OCR review and approval.
- Governance recalculation.
- Notification creation, acknowledgement, escalation, and resolution.
- Audit export.
- Webhook creation, test delivery, and replay if failed.
- Worker replay for delivery and OCR failures.

## Visual And UX Checks

For both desktop and mobile:

- No horizontal overflow.
- No visible console errors.
- No broken primary buttons.
- Loading states appear for async screens.
- Disabled states appear while actions are in progress.
- Success and error states are visible and readable.
- Demo remains unchanged and opens without database dependency.

## Release Readiness Result

Release can proceed only when:

- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes.
- `npm run test:demo` passes.
- `npm run phase8:qa` passes.
- Production database migration has been run.
- API, worker, Vercel frontend, Redis, database, and vault storage point to the intended environment.
