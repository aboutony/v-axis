# V-AXIS Phase 1 - Demo Preservation

Date: April 28, 2026

Status: Implemented locally.

## Preservation Rule

The current V-AXIS demo UI/UX is preserved as the protected demo experience. Future product frontend work must happen outside the demo entry point unless a demo-specific change is explicitly approved.

## Implemented Changes

- Created a dedicated `/demo` route.
- Moved the existing demo UI into `apps/web/src/DemoExperience.tsx`.
- Created a new route shell in `apps/web/src/App.tsx`.
- Added `/app` as a separate real product entry point.
- Redirected unknown routes and `/` to `/demo` to keep the current visible experience stable.
- Added `apps/web/scripts/check-demo-ui.mjs` for desktop and mobile demo regression checks.
- Added `npm run test:demo -w @vaxis/web` and root `npm run test:demo`.

## Route Map

| Route | Purpose | Database dependency |
| --- | --- | --- |
| `/demo` | Protected demo journey | None |
| `/app` | Real product entry point for future work | Not yet connected |
| `/` | Redirects to `/demo` | None |
| `*` | Redirects to `/demo` | None |

## Regression Coverage

The demo regression check:

- Starts the web app locally.
- Opens `/demo` on desktop viewport.
- Opens `/demo` on mobile viewport.
- Confirms V-AXIS demo content renders.
- Confirms at least 20 demo buttons are present.
- Confirms no horizontal overflow.
- Clicks visible demo buttons.
- Fails if the demo attempts API/database-dependent requests.
- Fails on browser page errors.

## Verification Commands

Run these from the repository root:

```powershell
npm run build -w @vaxis/web
npm run test -w @vaxis/web
npm run test:demo -w @vaxis/web
```

Or use:

```powershell
npm run test:demo
```

## Verified Results

- Web build: passed.
- Web unit tests: passed.
- Demo desktop/mobile clickability regression: passed.

## Open Follow-Ups

- Add screenshot comparison once a visual baseline approval process is chosen.
- Decide whether to deploy `/demo` from the same Vercel project or create a separate demo Vercel project.
- Protect demo route in future PR review checklist.
