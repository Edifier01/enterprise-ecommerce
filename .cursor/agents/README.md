# Agents

Subagent specialists for the Enterprise E-Commerce platform. Cursor reads agent definitions from this directory.

## Usage

Invoke by name in chat, e.g. `/backend-engineer` or `@backend-engineer`.

Every agent must:

1. Read `.cursor/project-management/` (CURRENT_CONTEXT, PROJECT_STATUS, TASKS, DECISIONS, HANDOFF)
2. Follow related rules in `.cursor/rules/`
3. Update PM state after completing work

## Agent Index

| Agent | Role | Model | Primary domains |
|-------|------|-------|-----------------|
| `enterprise-architect` | Architecture, ADRs, DDD boundaries | Opus | Cross-cutting design |
| `backend-engineer` | FastAPI use cases, repositories, routes | Composer 2.5 | `apps/api/` |
| `frontend-engineer` | Next.js App Router, shadcn/ui | Composer 2.5 | `apps/web/` |
| `database-engineer` | PostgreSQL schema, migrations, indexes | Composer 2.5 | Alembic, SQL |
| `api-engineer` | REST design, OpenAPI, versioning | Composer 2.5 | `openapi.yaml` |
| `catalog-specialist` | Products, categories, variants | Composer 2.5 | Catalog feature |
| `checkout-specialist` | Cart, Stripe, webhooks, orders | Opus | Checkout, payments |
| `security-auditor` | Auth, PCI, OWASP audits | Opus | Sensitive modules (readonly) |
| `qa-engineer` | Playwright E2E, integration tests | Composer 2.5 | Test flows |
| `devops-engineer` | Docker, CI/CD, GitHub Actions | GPT-5.5 | Pipelines, deploy |
| `verifier` | Validates completed work before done | Opus | Post-implementation check |

## Workflows

Domain workflows live in `workflows/` at repo root:

- `workflows/catalog-feature.md` — catalog implementation
- `workflows/checkout-feature.md` — checkout and payments
- `workflows/session-handoff.md` — agent session start/stop

## Related

- Template: `templates/07-agent-template.md`
- Orchestration: `.cursor/skills/subagent-orchestrator/SKILL.md`
- PM protocol: `.cursor/rules/core/10-project-state-management.mdc`
