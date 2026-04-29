# V-AXIS Final Development Roadmap

Date: April 28, 2026

## Executive Summary

V-AXIS currently has a strong backend foundation, a polished demo experience, and a partially developed real product frontend. The immediate roadmap must protect the demo environment, restore and complete the production product UI, initialize and validate the live backend, and add a production-grade OCR and document intelligence service for PDF, PNG, JPEG, and JPG uploads.

The OCR capability is required because users will upload government, compliance, workforce, and corporate documents into the platform. V-AXIS must read those files, extract the right metadata, ask users to confirm uncertain values, and then add the approved data into the document registry, governance engine, notifications, dashboards, and audit trail.

## Current Verified Baseline

- GitHub local checkout is synced with `origin/main`.
- Current commit reviewed: `53f8544 Add multi-channel alert center`.
- `npm run build` passes for API and web.
- `npm run test` passes for API and web.
- Vercel production deployment is live and serving the current demo-style build.
- Render API is reachable at `https://v-axis-api.onrender.com/health`.
- Render API docs are reachable at `https://v-axis-api.onrender.com/docs`.
- Render API reports that the production database schema has not been initialized.
- The deployed frontend is currently a demo journey, not the real connected product shell.
- The real product page files exist but are broken or orphaned.
- Demo UI was verified as clickable on desktop and mobile.

## Critical Product Principle

Demo and real product environments must be separated.

The demo must remain intact across the entire development journey. Future production work must not overwrite or destabilize the demo experience used for sales, stakeholder walkthroughs, and progress comparison.

## Environment Strategy

### Demo Environment

Purpose: stable client-facing demonstration.

Required outcome:

- Dedicated `/demo` route or dedicated demo deployment.
- Uses deterministic fake data.
- No dependency on production database availability.
- No accidental writes to production data.
- Visual and clickability regression checks before every release.
- Demo content remains stable unless explicitly approved.

### Real Product Environment

Purpose: production-ready connected application.

Required outcome:

- Dedicated app route or deployment connected to the real API.
- Uses authenticated sessions, tenant data, document uploads, OCR extraction, governance rules, notifications, audit logs, and live dashboards.
- Connected to Render API, PostgreSQL, Redis, worker, and durable vault storage.
- Protected by environment variables and production secrets.

## Phase 0 - Stabilize Source Control And Deployment Baseline

Status: Required immediately.

Objectives:

- Confirm GitHub, Vercel, Render API, Render worker, and any third Render service are mapped to the correct branches and runtime roles.
- Resolve the mismatch between `render.yaml`, which defines two services, and the three Render dashboard links provided.
- Document the source of truth for each environment.

Deliverables:

- Deployment inventory table covering GitHub, Vercel, Render API, Render worker, database, Redis, and storage.
- Branch and auto-deploy policy for demo and production.
- Environment variable checklist for Vercel and Render.
- Release checklist for future deployments.

Acceptance criteria:

- Every live service has an owner, branch, purpose, and health check.
- Vercel and Render services are confirmed to use the intended GitHub commit.
- No unknown or legacy Render service remains unexplained.

## Phase 1 - Preserve Demo Environment

Status: Required before major product frontend work.

Objectives:

- Freeze the current demo as a protected experience.
- Make the demo reachable without depending on the production product shell.
- Add regression checks to ensure all demo buttons remain clickable.

Deliverables:

- `/demo` route or separate demo deployment.
- Demo entry point separated from real product entry point.
- Demo regression test for desktop and mobile.
- Demo readme explaining what is intentionally fake.

Acceptance criteria:

- Demo opens successfully with no database.
- Demo buttons are clickable.
- Demo has no production API writes.
- Demo remains visually stable during product development.

## Phase 2 - Restore And Complete Real Product Frontend

Status: High priority.

Current issue:

The live frontend mounts a demo journey. Real product pages exist but are not properly mounted. Several page wrappers lazy-import themselves, and one frontend module contains Node `fs.writeFileSync` code.

Objectives:

- Replace broken page wrappers.
- Build a real app shell with routing, auth context, protected pages, and API integration.
- Keep demo separate.

Required product screens:

- Launchpad and tenant bootstrap.
- Login and refresh-session flow.
- MFA enrollment and verification.
- Main workspace shell.
- Dashboard summary.
- Taxonomy and entity management.
- Document registry and upload.
- OCR extraction review queue.
- User and permission management.
- Governance rules.
- Notification/action center.
- Audit explorer and export.
- Webhook and connector settings.
- Automation and worker status.

Acceptance criteria:

- Real product app is reachable separately from demo.
- All navigation items route to working screens.
- All primary buttons either complete the action or show a clear disabled/loading/error state.
- API errors are visible to users and recoverable.
- Mobile and desktop layouts have no horizontal overflow.

## Phase 3 - Initialize And Validate Production Backend

Status: Blocking production readiness.

Current issue:

The Render API is reachable, but `/api/v1/platform/bootstrap` reports `databaseReady: false`.

Objectives:

- Run production database migrations.
- Confirm seed data strategy.
- Verify Redis and worker connectivity.
- Validate session cookies, CORS, and frontend origin settings.

Deliverables:

- Production migration runbook.
- Verified production database schema.
- Worker health/status verification.
- API smoke test suite against Render.
- Production tenant bootstrap test.

Acceptance criteria:

- `/api/v1/platform/bootstrap` reports database readiness.
- Tenant bootstrap works in production.
- Login, MFA, refresh, logout, and invite/reset flows work.
- Worker-backed jobs can be queued and processed.
- Dashboard, governance, notifications, audit, connectors, and webhooks return expected data.

## Phase 4 - OCR And Document Intelligence Service

Status: Implemented baseline; scanned-PDF rasterization remains hardening work.

Current observation:

The repository includes early OCR-related pieces, including a Tesseract-based extractor service and upload UI accepting `.pdf`, `.jpg`, `.jpeg`, and `.png`. Phase 4 now has a protected OCR preview endpoint, document-family classification rules, template-based field extraction profiles, persisted OCR job state, worker queue processing, retry controls, approval into the registry, governance recalculation, and OCR audit events. Text-based PDFs are supported through their embedded text layer; image-only/scanned PDFs still require the next hardening item: server-side page rasterization.

Objectives:

- Build a production-grade OCR ingestion pipeline.
- Extract structured metadata from uploaded documents.
- Support Arabic and English documents.
- Support PDF, PNG, JPEG, and JPG.
- Allow human review before extracted values update platform records.
- Feed approved data into governance, notifications, dashboard health, and audit logs.

OCR pipeline:

1. User uploads a document.
2. File is stored in the vault.
3. OCR job is queued.
4. Worker extracts text and layout data.
5. Classifier identifies document type.
6. Extractor reads key fields.
7. Platform calculates confidence scores.
8. User reviews extracted fields.
9. User approves or edits values.
10. Approved metadata updates the document registry.
11. Governance rules recalculate document status and alerts.
12. Audit log records the full extraction and approval trail.

Fields to extract by document family:

- Commercial Registration: CR number, entity name, issue date, expiry date, authority, registration status.
- ZATCA certificate: certificate number, tax/VAT number, issue date, expiry date, entity name.
- Baladiyah license: license number, municipality, issue date, expiry date, business activity, location.
- GOSI record: registration number, entity name, issue date, expiry or validity status.
- Muqeem/Iqama: employee name, iqama number, nationality, expiry date, sponsor/entity.
- Labor/work permit: permit number, employee name, issue date, expiry date, occupation, entity.
- Insurance: policy number, provider, coverage dates, insured entity/person.
- Generic administrative asset: title, authority, document number, issue date, expiry date.

Technical requirements:

- Dedicated OCR queue and worker path.
- OCR status model: uploaded, queued, processing, needs review, approved, failed.
- Extracted text storage with access controls.
- Field-level confidence scores.
- Human review UI.
- Field validation per document type.
- Duplicate detection using checksum and key document identifiers.
- Audit events for upload, extraction, edit, approval, failure, and reprocessing.
- Retry and replay support for failed OCR jobs.
- Clear separation between raw OCR text and approved platform data.

Recommended implementation approach:

- Start with local/open-source OCR using Tesseract for Arabic and English.
- Add PDF rasterization or text extraction depending on whether PDF pages are scanned or text-based.
- Add document-type-specific extraction rules.
- Add confidence thresholds that route uncertain documents to manual review.
- Keep provider abstraction so cloud OCR can be added later if higher accuracy is needed.

Acceptance criteria:

- User can upload PDF, PNG, JPEG, and JPG files.
- OCR processing does not block the user interface.
- Extracted fields appear in a review screen.
- User can approve or correct extracted values.
- Approved values create or update document records.
- Low-confidence fields are clearly marked.
- Failed OCR jobs are visible and retryable.
- Upload, OCR, review, and approval actions are present in the audit log.

## Phase 5 - Durable Vault Storage

Status: Implemented baseline.

Current issue:

Deployment documentation warned that local filesystem vault storage was not the final production storage model. Phase 5 now provides a durable S3-compatible vault driver with local/persistent-disk fallback, tenant-authorized retrieval endpoints, and version download support.

Objectives:

- Move document storage to durable storage or attach a persistent disk.
- Protect uploaded files with tenant-aware authorization.
- Support file versioning and retrieval.

Deliverables:

- Durable vault adapter.
- Storage configuration per environment.
- File access authorization checks.
- Backup and retention policy.
- Current and versioned file download controls in the real product UI.

Acceptance criteria:

- Uploaded files survive service restarts and redeployments.
- Files are scoped to the correct tenant.
- Document versions are retrievable.
- Storage failures are visible and recoverable.

## Phase 6 - Worker, Automation, And Notification Reliability

Status: Implemented baseline.

Objectives:

- Verify Render worker deployment.
- Confirm Redis queue health.
- Ensure notification delivery, governance refresh, escalation, webhook delivery, and OCR jobs run reliably.

Deliverables:

- Worker health endpoint or status panel.
- Queue monitoring in product UI.
- Retry and replay controls.
- Operational alerts for failed background jobs.
- Redis ping status, delivery/maintenance/OCR queue counts, and manual governance/escalation controls in the product UI.

Acceptance criteria:

- Worker service is confirmed live.
- Queue jobs process successfully.
- Failed jobs can be replayed.
- Automation status is visible to admins.
- OCR jobs are visible and replayable when failed.

## Phase 7 - Security, Compliance, And Multi-Tenant Hardening

Status: Implemented baseline.

Objectives:

- Harden authentication, authorization, tenant isolation, file access, secrets, and auditability.

Deliverables:

- Permission matrix review.
- Tenant isolation tests.
- File access tests.
- Secret rotation checklist.
- Audit event coverage map.
- Production cookie/CORS verification.
- Permission matrix, production security policy, trusted origin, and tenant file access tests.

Acceptance criteria:

- Users cannot access another tenant's data or files.
- Sensitive secrets are not committed.
- Critical actions are audited.
- Production cookies and CORS work only for trusted origins.
- Wildcard frontend/CORS origins are rejected.
- Tenant file paths are checked before vault retrieval.

## Phase 8 - End-To-End QA And Release Readiness

Status: Implemented baseline release gate.

Objectives:

- Validate the complete real product journey while preserving demo.

QA journeys:

- Demo walkthrough.
- Tenant bootstrap.
- Login, MFA, invite, reset.
- Entity and taxonomy setup.
- Document upload.
- OCR extraction and review.
- Document registry update.
- Governance recalculation.
- Notification and escalation.
- Audit export.
- Webhook test.
- Worker replay.

Acceptance criteria:

- All critical journeys pass on production-like environment.
- UI buttons and forms are clickable and functional.
- No console errors in major flows.
- No layout overflow on mobile or desktop.
- Demo remains intact.
- Automated `phase8:qa` browser and API smoke gate passes.

## Progress Tracking Checklist

- [ ] Confirm all GitHub, Vercel, and Render services are mapped.
- [x] Initialize production database schema on Render for the Frankfurt API/database pair.
- [x] Add Render worker and queue status visibility.
- [x] Separate demo from real product.
- [x] Freeze demo route and add clickability regression tests.
- [x] Repair real product frontend routing.
- [x] Connect real frontend shell to real API modules.
- [x] Build OCR queue and worker pipeline.
- [x] Add OCR extraction rules for priority document families.
- [x] Add OCR review and approval UI.
- [x] Feed approved OCR data into document registry.
- [x] Recalculate governance after OCR approval.
- [x] Add OCR audit events.
- [x] Move vault storage to durable production storage.
- [x] Validate tenant isolation and file access.
- [x] Add end-to-end QA and release readiness gate.
- [ ] Publish production release checklist.

## Priority Order

1. Stabilize deployments and environments.
2. Preserve the demo.
3. Initialize production backend database.
4. Restore real product frontend.
5. Build OCR and document intelligence.
6. Harden storage, worker reliability, and security.
7. Complete end-to-end QA.

## Final Recommendation

Treat OCR as a core product module, not an add-on. V-AXIS depends on document intelligence: uploaded documents should become structured, governed, auditable records. The demo can continue to show the story, but the production product must now focus on the upload-to-OCR-to-review-to-governance journey.
