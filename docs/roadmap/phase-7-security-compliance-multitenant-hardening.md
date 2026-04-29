# Phase 7 - Security, Compliance, And Multi-Tenant Hardening

Status: Implemented baseline.

## What Changed

- Added permission matrix tests to guard role drift.
- Added production security policy tests for cookies, trusted origins, and secret length.
- Hardened trusted frontend origin parsing:
  - Wildcards are rejected.
  - Non-HTTP origins are rejected.
  - `APP_BASE_URL` and `CORS_ORIGIN` are normalized to exact origins.
- Added tenant-aware vault file access helpers and tests.
- Applied tenant/path ownership checks to document current-file and version-file retrieval.
- Added explicit checks that stored vault paths start with the requesting tenant ID.

## Permission Matrix

Current baseline:

- `MASTER_ADMIN`: full platform permissions.
- `CLIENT_ADMIN`: full tenant administration permissions.
- `SUBSIDIARY_MANAGER`: entity/document/notification/report operations.
- `STAFF`: view entities and upload documents only.

Guardrails:

- `STAFF` must not receive document management, user management, audit, vault, taxonomy, or notification management permissions.
- `CLIENT_ADMIN` must retain vault configuration.
- `MASTER_ADMIN` must retain audit visibility.

## Tenant Isolation

Tenant isolation is enforced through:

- Authenticated JWT tenant context.
- Tenant-scoped database predicates on document, version, OCR, notification, user, automation, and taxonomy queries.
- Tenant-prefixed vault object paths.
- Additional file retrieval guard that rejects mismatched vault object paths even if an incorrect row is supplied.

## File Access

Protected endpoints:

- `GET /api/v1/documents/:documentId/file`
- `GET /api/v1/documents/:documentId/versions/:versionNumber/file`

Rules:

- Request must be authenticated.
- Document/version row must belong to `request.user.tenantId`.
- Document must not be deleted.
- Stored file path must begin with the same tenant ID.
- Responses use `Cache-Control: private, no-store`.

## Secrets, Cookies, CORS, And Origin Policy

Production requirements:

- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none` only with secure cookies.
- `CORS_ORIGIN` must be exact origins, comma-separated, no wildcard.
- `APP_BASE_URL` must be an HTTPS frontend origin.
- `JWT_SECRET` or key material must be strong and managed as a secret.
- `APP_ENCRYPTION_SECRET` and `MFA_ENCRYPTION_SECRET` must be strong and managed as secrets.
- API and worker must share encryption and vault secrets.

## Audit Coverage

Implemented audit coverage includes:

- Tenant bootstrap.
- Login success/failure.
- User created, invited, updated, password reset.
- Document upload, replacement, critical master marking.
- OCR queued, completed, failed, retried, approved.
- Governance rule updates.
- Notification created, acknowledged, escalated, resolved.
- Connector and webhook updates.
- Email template changes.
- Delivery replay.

## Remaining Hardening

- Add full end-to-end tenant isolation tests against a test database.
- Add secret rotation runbooks.
- Add audit export integrity checks.
- Add rate limiting for auth, upload, OCR preview, and webhook test endpoints.
- Add malware scanning before vault persistence.
