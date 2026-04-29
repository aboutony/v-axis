# V-AXIS Delivery Team Required Skills

Prepared for: Delivery and implementation staffing  
Project: V-AXIS multi-tenant document governance platform  
Date: 2026-04-29

## 1. Purpose

This document defines the skills, roles, and practical responsibilities required to implement V-AXIS at a customer site. The delivery team should be able to configure the platform, validate production infrastructure, onboard customer administrators, run pilot document workflows, troubleshoot deployment issues, and transition the customer into support.

## 2. Recommended Delivery Team Structure

| Role | Required Level | Primary Responsibility |
| --- | --- | --- |
| Delivery Lead | Senior | Own customer implementation plan, sign-off, risks, and stakeholder communication. |
| Solution Architect | Senior | Map customer governance needs to V-AXIS tenants, entities, taxonomy, storage, and integration model. |
| DevOps / Cloud Engineer | Senior | Own Vercel, Render, PostgreSQL, Redis, secrets, DNS, deployment, monitoring, and backup readiness. |
| Backend Engineer | Mid to Senior | Validate API behavior, migrations, auth, worker automation, webhooks, and environment configuration. |
| Frontend Engineer | Mid | Validate customer-facing workflows, browser compatibility, and frontend environment configuration. |
| Database Engineer | Mid to Senior | Own PostgreSQL migrations, backup/restore verification, data checks, and performance review. |
| Security / Compliance Specialist | Senior | Review tenant boundaries, MFA, secrets, audit logs, retention, data residency, and customer controls. |
| Document Governance Specialist | Senior domain role | Configure customer taxonomy, document rules, governance metrics, and operating model. |
| QA / UAT Analyst | Mid | Execute automated QA, manual journey checklist, defect triage, and customer UAT evidence. |
| Customer Training Specialist | Mid | Train administrators and end users, prepare adoption materials, and support go-live readiness. |
| Support Engineer | Mid | Own post-go-live monitoring, incident triage, and handover to steady-state support. |

## 3. Role Details

### Delivery Lead

Required skills:

- Customer implementation planning.
- Scope, risk, dependency, and decision tracking.
- Executive and working-team communication.
- Cutover planning and go-live governance.
- Sign-off facilitation.

Responsibilities:

- Maintain the implementation plan and go-live checklist.
- Confirm customer stakeholders and approval path.
- Coordinate environment readiness, UAT, training, and production launch.
- Own issue escalation and final delivery acceptance.

Acceptance indicators:

- Customer has approved scope and deployment plan.
- Manual production journey checklist is scheduled and assigned.
- Go-live decision is documented.

### Solution Architect

Required skills:

- Multi-tenant SaaS architecture.
- Document governance operating models.
- Data residency and integration planning.
- Security-by-design and customer control mapping.
- Practical knowledge of V-AXIS workflows.

Responsibilities:

- Translate customer organization structure into tenants, entities, categories, and rules.
- Confirm integration boundaries for email, webhooks, storage, and identity.
- Define pilot scope and production rollout sequence.
- Validate that the customer implementation model fits the platform capabilities.

Acceptance indicators:

- Customer taxonomy and entity model are approved.
- Integration architecture is documented.
- Production readiness risks are identified before go-live.

### DevOps / Cloud Engineer

Required skills:

- Vercel project deployment and environment management.
- Render web service and worker service configuration.
- PostgreSQL and Redis managed service operations.
- Secret management and rotation.
- Deployment logs, health checks, and rollback procedures.
- DNS/TLS basics where custom domains are used.

Responsibilities:

- Configure Vercel `VITE_API_URL`.
- Configure Render API and worker environment variables.
- Run or coordinate database migrations.
- Verify `/health`, `/docs`, CORS, worker startup, and queue connectivity.
- Document rollback and incident response steps.

Acceptance indicators:

- Frontend, API, and worker are deployed and healthy.
- Production environment variables are complete and secret-safe.
- Render and Vercel logs show no startup failures.

### Backend Engineer

Required skills:

- Node.js and TypeScript.
- Fastify API development and troubleshooting.
- Zod validation and API contract checks.
- JWT sessions, cookies, MFA, and role-based access controls.
- BullMQ/Redis job processing.
- Webhook signing and replay patterns.

Responsibilities:

- Validate auth, tenant bootstrap, user administration, documents, audit, automation, and webhook routes.
- Triage API errors during implementation.
- Confirm worker replay and scheduled automation behavior.
- Support customer-specific backend configuration questions.

Acceptance indicators:

- API smoke checks pass against production.
- Protected endpoints reject unauthenticated access.
- Worker automation can process and replay jobs.

### Frontend Engineer

Required skills:

- React, Vite, TypeScript, React Query, React Router.
- Environment-driven API configuration.
- Browser dev tools and production UI troubleshooting.
- Responsive UI validation.
- UAT support for business workflows.

Responsibilities:

- Verify Vercel deployment and frontend API connectivity.
- Execute UI checks on desktop and mobile.
- Support customer UAT for tenant admin, taxonomy, document registry, audit, automation, and access flows.
- Triage UI defects and coordinate fixes.

Acceptance indicators:

- Demo and `/app` routes render correctly.
- Customer workflows are usable in supported browsers.
- No blocking frontend console errors remain.

### Database Engineer

Required skills:

- PostgreSQL operations.
- Drizzle migrations.
- Backup and restore validation.
- Query and index review.
- Production data handling and change control.

Responsibilities:

- Confirm production database connection and migration status.
- Run migrations through an approved process.
- Validate backup/restore readiness before go-live.
- Support data checks for tenant bootstrap and document workflows.

Acceptance indicators:

- Migration history is current.
- Backup/restore process is tested or formally accepted.
- Database readiness reports healthy through the API bootstrap endpoint.

### Security / Compliance Specialist

Required skills:

- SaaS security review.
- MFA, session, cookie, CORS, and secret management controls.
- Audit logging and evidence review.
- Data classification, retention, and data residency.
- Customer compliance documentation.

Responsibilities:

- Verify production secrets are strong and not committed to source control.
- Confirm CORS and cookie settings match the customer deployment model.
- Review audit export behavior and customer evidence requirements.
- Review vault storage permissions and encryption posture.
- Confirm go-live risk acceptance for any deferred control.

Acceptance indicators:

- Security checklist is signed off.
- Secrets and storage controls are production-appropriate.
- Audit and retention expectations are documented.

### Document Governance Specialist

Required skills:

- Document control, records management, and governance policy design.
- Entity and category modeling.
- Review and approval workflows.
- Risk scoring and compliance reporting concepts.
- Customer workshop facilitation.

Responsibilities:

- Define customer document categories, entities, required document rules, and review policies.
- Guide pilot document selection.
- Validate OCR/review workflow fit with customer operations.
- Train customer owners on governance dashboards and audit outputs.

Acceptance indicators:

- Customer taxonomy is configured and validated.
- Pilot documents produce expected governance outcomes.
- Customer owners understand operating procedures.

### QA / UAT Analyst

Required skills:

- Test planning and evidence capture.
- Browser and API smoke testing.
- Regression testing.
- Customer UAT facilitation.
- Defect triage and severity classification.

Responsibilities:

- Run automated checks: `typecheck`, `test`, `build`, `test:demo`, and `phase8:qa`.
- Execute the manual production journey checklist.
- Record evidence for customer sign-off.
- Coordinate retesting after fixes.

Acceptance indicators:

- Automated QA evidence is captured.
- Manual journeys are passed or exceptions are approved.
- UAT defects are triaged and resolved or accepted.

### Customer Training Specialist

Required skills:

- Administrator and end-user training.
- Process documentation.
- Change adoption and floor-walking support.
- Clear explanation of governance workflows.

Responsibilities:

- Prepare training sessions for admins, reviewers, document owners, and support users.
- Explain tenant bootstrap, MFA, invites, taxonomy, documents, OCR review, audit, and automation panels.
- Capture common support questions and feed them into the knowledge base.

Acceptance indicators:

- Customer administrators can operate the platform without delivery-team intervention.
- Training attendance and materials are recorded.
- Post-training questions are tracked.

### Support Engineer

Required skills:

- Production incident triage.
- Log review across Vercel and Render.
- API, frontend, worker, database, Redis, and storage troubleshooting.
- Customer communication during incidents.

Responsibilities:

- Monitor the first production use window.
- Triage login, upload, OCR, notification, webhook, and worker issues.
- Escalate defects to engineering with logs and reproduction steps.
- Own transition into steady-state support.

Acceptance indicators:

- Support runbook is ready.
- First-use monitoring is assigned.
- Escalation path and severity model are understood.

## 4. Platform Knowledge Areas

The delivery team must collectively understand:

- Tenant bootstrap and tenant isolation.
- JWT session behavior and MFA enrollment.
- Invite and password reset workflows.
- Entity, taxonomy, and document rule configuration.
- Document upload, versioning, OCR extraction, and review.
- Governance recalculation and dashboard interpretation.
- Notification creation, acknowledgement, escalation, and resolution.
- Webhook configuration, signed delivery, and replay.
- Audit exploration and export.
- Worker queues, scheduled jobs, and replay operations.
- Vercel and Render deployment workflows.
- PostgreSQL migrations and production data handling.
- Redis queue availability and failure modes.
- Vault storage configuration and recovery expectations.

## 5. Minimum Go-Live Staffing

For a controlled customer pilot, the minimum recommended staffing is:

| Role | Allocation |
| --- | --- |
| Delivery Lead | Part-time through full implementation; full-time during go-live window. |
| Solution Architect | Part-time during discovery and configuration; on call during UAT. |
| DevOps / Cloud Engineer | Full-time during deployment; on call during go-live. |
| Backend Engineer | On call during deployment, UAT, and first production use. |
| Frontend Engineer | On call during UAT and first production use. |
| QA / UAT Analyst | Full-time during UAT execution. |
| Document Governance Specialist | Full-time during customer configuration workshops; part-time during UAT. |
| Customer Training Specialist | Part-time before go-live; available during first-use support. |
| Support Engineer | Assigned before go-live and active during hypercare. |

## 6. Readiness Checklist

| Checklist Item | Owner |
| --- | --- |
| Customer deployment topology approved | Delivery Lead / Solution Architect |
| Production secrets generated and stored correctly | DevOps / Security |
| Vercel environment configured | DevOps |
| Render API and worker environments configured | DevOps |
| Production migrations completed | Database Engineer |
| Automated QA passed | QA Analyst |
| Manual production journeys passed | QA Analyst / Customer |
| Customer taxonomy approved | Governance Specialist |
| SMTP and webhook integrations tested | Backend Engineer / DevOps |
| Audit export verified | QA Analyst / Compliance |
| Customer admin training completed | Training Specialist |
| Hypercare ownership assigned | Support Engineer |

## 7. Recommended Certifications Or Experience

Certifications are not mandatory, but the following experience profiles are useful:

- Cloud deployment experience with Vercel, Render, Railway, Heroku, AWS, Azure, or GCP.
- PostgreSQL production operations experience.
- Redis/BullMQ or similar queue-processing experience.
- Security experience with SaaS auth, MFA, CORS, cookies, and secret management.
- Records management, document control, ISO, audit, or compliance workflow experience.
- Practical TypeScript/React/Node.js production support experience.

## 8. Final Staffing Guidance

The most important delivery-team capability is not a single technology skill. It is the ability to combine customer governance knowledge with production SaaS operations. V-AXIS implementation requires people who can configure business rules, protect customer data, validate live infrastructure, guide users through document workflows, and calmly troubleshoot issues during first use.
