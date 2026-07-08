# Tier 1 Skills — Stack Core

Verified import for Enterprise E-Commerce Platform (Next.js + FastAPI + PostgreSQL).

| Skill | Path | Status |
|-------|------|--------|
| shadcn | `.cursor/skills/shadcn/` | Imported (11 files incl. `rules/`) |
| python-fastapi-development | `.cursor/skills/python-fastapi-development/` | Imported + monorepo paths |
| fastapi-pro | `.cursor/skills/fastapi-pro/` | Imported |
| fastapi-templates | `.cursor/skills/fastapi-templates/` | Imported |
| nextjs-app-router-patterns | `.cursor/skills/nextjs-app-router-patterns/` | Imported |
| nextjs-best-practices | `.cursor/skills/nextjs-best-practices/` | Imported |
| react-nextjs-development | `.cursor/skills/react-nextjs-development/` | Imported |
| postgresql | `.cursor/skills/postgresql/` | Imported |
| postgresql-optimization | `.cursor/skills/postgresql-optimization/` | Imported |
| zod-validation-expert | `.cursor/skills/zod-validation-expert/` | Imported |
| zustand-store-ts | `.cursor/skills/zustand-store-ts/` | Imported + `apps/web/src/store/` |

## Monorepo Conventions

- **Frontend:** `apps/web/` — Next.js App Router, shadcn in `apps/web/components/ui/`
- **Backend:** `apps/api/` — FastAPI features under `apps/api/app/features/`
- **Database:** PostgreSQL via Alembic in `apps/api/migrations/`

## MCP Pairing

| Skill | MCP |
|-------|-----|
| shadcn | shadcn MCP |
| postgresql, postgresql-optimization | PostgreSQL MCP |
| python-fastapi-development, fastapi-pro | OpenAPI, Context7 |
| nextjs-* | Context7, shadcn |

## Invocation

```
/shadcn
/fastapi-pro
/nextjs-app-router-patterns
/postgresql
/zod-validation-expert
/zustand-store-ts
```
