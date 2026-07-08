# ADR-001: Monorepo Structure for E-Commerce Platform

**Status:** Accepted  
**Date:** 2026-07-07

## Context

The AI development platform is complete. Application code requires a monorepo aligned with existing rules (feature-first, FastAPI + Next.js + PostgreSQL).

## Decision

Adopt monorepo layout:

- `apps/api/` — FastAPI modular monolith
- `apps/web/` — Next.js App Router storefront
- `openapi.yaml` at repo root for contract-first API
- `docker-compose.yml` for local PostgreSQL

## Consequences

**Positive:** Single repo for AI rules + application; MCP OpenAPI server works out of box.

**Negative:** Repo grows; clear `.cursorignore` may be needed later for `node_modules`.

## Related

- `architecture/04-folder-structure.mdc`
- Phase 24 PROJECT_ROADMAP
