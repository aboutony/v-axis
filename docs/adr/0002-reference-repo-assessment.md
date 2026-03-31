# ADR 0002: Reference Repository Assessment

## Status

Accepted

## Context

Two reference repositories were considered before starting implementation:

- `aboutony/MiroFish`
- `aboutony/PropTech-Sovereign`

## Decision

Neither repository is used as the architectural foundation for V-AXIS.

## Rationale

### MiroFish

MiroFish is a multi-agent simulation and forecasting system. It is ambitious and technically interesting, but its core problem domain is prediction through swarm or agentic simulation. V-AXIS needs a tenant-safe control plane for document governance first. Importing a simulation-heavy codebase now would create integration cost without solving the critical platform basics.

### PropTech-Sovereign

PropTech-Sovereign is closer to a lightweight frontend starter. It is not opinionated enough about governance workflows, enterprise auth, data contracts, or audit-safe backend structure to serve as the backbone of this platform.

## Consequences

- We build a purpose-shaped foundation instead of forcing a mismatch
- We can still borrow visual or interaction ideas later where useful
- The repository remains focused on governance, compliance, and operational control rather than generic demo scaffolding
