# Memory MCP Guide

Persistent project knowledge via Memory MCP (`@modelcontextprotocol/server-memory`).

## System Boundaries

| System | Purpose | Location |
|--------|---------|----------|
| **Memory MCP** | Naming conventions, aggregate boundaries, rejected alternatives | MCP server + this guide |
| **DECISIONS.md** | Quick index of architectural decisions with ADR links | `.cursor/project-management/` |
| **docs/adr/** | Full Architecture Decision Records (canonical for architecture) | `docs/adr/` |
| **HANDOFF.md** | Latest agent session transfer | `.cursor/project-management/` |
| **TASKS.md** | Task registry with statuses | `.cursor/project-management/` |

Do not use Memory MCP for task tracking or handoffs — use project-management files.

## When to Write Memory

Before creating new conventions, record:

- Naming decisions (tables, API paths, event names)
- Aggregate boundaries (checkout vs orders)
- Technology choices (Alembic, Stripe Checkout Session vs PaymentIntent)
- Rejected alternatives from ADRs

After ADR accepted: optional Memory summary + required `DECISIONS.md` index entry.

## When to Read Memory

- Start of architecture tasks
- Before large refactoring
- When `/context-loading` runs (Phase 0 project state first, then Memory for conventions)

## Skill Integration

Use with `architecture-decision-records`:

1. Create ADR in `docs/adr/`
2. Add index entry in `.cursor/project-management/DECISIONS.md`
3. Optionally store convention summary in Memory MCP

## MCP Config

Configured in `.cursor/mcp.json` as `memory` server.

## Related Rules

- ai/00-ai, architecture/06-adr, core/05-context-loading, core/10-project-state-management
