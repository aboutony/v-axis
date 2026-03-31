# ADR 0001: Foundation Architecture

## Status

Accepted

## Context

The source documents define a high-trust governance platform with demanding requirements around multi-tenancy, auditability, document lifecycle control, and predictive compliance. The docs also contain some internal tension:

- They describe separate-schema multi-tenancy while also requiring tenant-aware tables and row-level controls.
- They depend on document intelligence modules before a concrete document intake flow is available.
- They position hybrid vault, offline sync, and integrations early in the narrative even though those add substantial complexity.

## Decision

The initial platform foundation uses:

- A monorepo split into web, api, domain, and db packages
- PostgreSQL as the source-of-truth system of record
- Shared domain contracts that are imported by both frontend and backend
- Fastify for the control-plane API
- React + Vite for the internal command-center frontend
- Docker Compose for free local infrastructure

For the first implementation phase, tenant isolation is expressed through tenant-aware tables and strict application boundaries. This keeps the domain model simple enough to deliver core value quickly while preserving a path to stronger enterprise isolation strategies later.

## Consequences

### Positive

- Faster MVP delivery with lower operational overhead
- One domain language shared across data, API, and UI
- A clean path to later add RLS, dedicated tenant deployments, and hybrid vault storage
- No paid platform dependency required to develop or validate the product

### Tradeoffs

- Enterprise-grade deployment topologies are not fully implemented on day one
- MFA, vault, and workflow escalation are scaffolded conceptually faster than they are fully realized in code
- Dedicated on-prem or private-cloud storage connectors remain a later phase

## Follow-Up

- Add RLS migration scripts and tenant-scoped query enforcement
- Expand auth from bootstrap/login flows to full MFA lifecycle
- Implement document upload, storage abstraction, and audit-complete file operations
