# Phase 6 - Worker, Automation, And Notification Reliability

Status: Implemented baseline.

## What Changed

- Added Redis ping status to the automation overview.
- Added OCR queue monitoring beside delivery and maintenance queues.
- Added recent OCR job visibility in the admin automation screen.
- Added failed OCR replay endpoint:
  - `POST /api/v1/automation/ocr/:id/replay`
- Existing failed delivery replay remains available:
  - `POST /api/v1/automation/deliveries/:id/replay`
- Added manual maintenance run endpoints:
  - `POST /api/v1/automation/maintenance/maintenance.governance.refresh-all-tenants/run`
  - `POST /api/v1/automation/maintenance/maintenance.notifications.escalate-all-tenants/run`
- Added real product admin controls for:
  - Queue health.
  - Delivery, maintenance, and OCR failures.
  - Failed delivery replay.
  - Failed OCR replay.
  - Manual governance refresh.
  - Manual notification escalation.

## Reliability Coverage

- Notifications: visible in delivery queue and replayable if failed.
- Governance refresh: scheduled by worker and manually queueable by admin.
- Escalation: scheduled by worker and manually queueable by admin.
- Webhook delivery: visible in delivery queue and replayable if failed.
- OCR jobs: visible in OCR queue and replayable if failed.

## Render Verification Checklist

1. Confirm the Frankfurt worker service is deployed from the same commit as the API.
2. Confirm worker has the same `DATABASE_URL`, `REDIS_URL`, `VAULT_*`, encryption, and queue env vars as the API.
3. Open worker logs and verify startup shows delivery, maintenance, and OCR workers ready.
4. Open `/app` Automation and confirm:
   - Queue available is `Yes`.
   - Redis ping is `PONG`.
   - Delivery, maintenance, and OCR queue counts load.
5. Use Run Governance and Run Escalation once after deployment.
6. Upload a document and confirm an OCR job appears.
7. Test webhook delivery from the Webhooks module.

## Remaining Hardening

- Add alerting if queue failures exceed a threshold.
- Add worker heartbeat table if Render process visibility is not enough.
- Add dead-letter queue retention policy.
- Add operational runbook for retry/replay decisions.
