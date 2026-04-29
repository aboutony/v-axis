# V-AXIS Phase 2 - Real Product Frontend Restoration

Date: April 28, 2026

Status: Implemented locally as the first connected product shell.

## Scope Completed

- Repaired broken page wrappers that lazy-imported themselves.
- Removed frontend `fs.writeFileSync` code from the taxonomy page wrapper.
- Mounted a real product entry under `/app/*`.
- Kept the protected demo isolated under `/demo`.
- Added `AuthProvider` around the product app.
- Added public access flow for sign-in and tenant bootstrap.
- Added protected workspace navigation.
- Connected product modules to the API client for:
  - Dashboard
  - Taxonomy
  - Documents
  - Users
  - Governance
  - Notifications
  - Audit
  - Webhooks
  - Connectors
  - Automation
- Added visible loading states, disabled states, success messages, and error messages for primary actions.

## Route Map

| Route | Purpose |
| --- | --- |
| `/demo` | Protected demo journey |
| `/app/*` | Real product frontend |
| `/` | Redirects to `/demo` |
| `*` | Redirects to `/demo` |

## Product Modules

### Access

- Loads platform bootstrap state.
- Shows database readiness.
- Supports login with tenant slug, email, password, and optional MFA code.
- Supports tenant bootstrap when backend database is ready.
- Shows recoverable API errors when the backend is unavailable.

### Dashboard

- Calls `fetchDashboardSummary`.
- Shows portfolio health, critical alerts, timeline count, and notification count.

### Taxonomy

- Calls `fetchTaxonomy`.
- Shows category slots and entities.

### Documents

- Calls `fetchDocuments` and `fetchDocumentTypes`.
- Provides upload control for PDF, PNG, JPEG, and JPG.
- Upload action is guarded by loading and error states.
- OCR review pipeline placeholder is represented in the module description for Phase 4.

### Users

- Calls `fetchUsers`.
- Supports issuing invite links through `sendUserInvite`.

### Governance

- Calls `fetchRules`.
- Supports governance recalculation through `refreshGovernance`.

### Notifications

- Calls `fetchNotifications`.
- Supports acknowledgement, resolution, and overdue escalation.

### Audit

- Calls `fetchAuditLogs`.
- Shows recent audit events.

### Webhooks

- Calls `fetchWebhooks`.
- Supports creating a disabled test webhook.
- Supports webhook test action.

### Connectors

- Calls `fetchConnectors`.
- Supports creating an inactive JSON mail connector.
- Supports test email action.

### Automation

- Calls `fetchAutomationOverview`.
- Shows queue availability, delivery mode, failures, and recent delivery jobs.

## Verification

Commands run:

```powershell
npm run build -w @vaxis/web
npm run build
npm run test
npm run test:demo
```

Additional browser smoke test:

- Opened `/app` with `VITE_API_URL` pointed to an unavailable local API.
- Confirmed the product access shell rendered.
- Confirmed the missing API state is shown as a recoverable error.
- Confirmed no horizontal overflow.
- Confirmed no browser page errors.

## Remaining Phase 2 Work

This implementation restores the real product frontend shell and API wiring, but deeper product completion remains:

- Build full create/edit forms for every module.
- Add OCR review queue UI in Phase 4.
- Add route-specific URLs for each product module if desired.
- Add richer validation for forms.
- Add visual regression screenshots for `/app`.
- Run the product shell against a migrated Render database after Phase 3.

