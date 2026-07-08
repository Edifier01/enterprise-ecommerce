---
name: model-routing
description: Select Composer 2.5, GPT-5.5, or Claude Opus 4.7 and matching MCP servers per task type. Use when starting any task or unsure which model to use.
---

# Model Routing

> **Rule:** `.cursor/rules/core/08-model-routing.mdc`

## Quick Selection

| Task | Model | MCP |
|------|-------|-----|
| CRUD, UI, tests, boilerplate | Composer 2.5 | PostgreSQL, shadcn, Filesystem |
| Research, docs, planning, math | GPT-5.5 | Context7, Fetch |
| Architecture, security, complex domain | Opus 4.7 | Memory, Context7 |
| E2E checkout | Composer 2.5 | Playwright |
| Deploy / CI | GPT-5.5 | Docker, GitHub |
| Prod debugging | Opus 4.7 | Sentry, GitHub |

## Steps

1. Classify task: implementation | research | architecture | security
2. Select model from table above
3. Enable only required MCP servers
4. Load only relevant rules (see `context-loading` skill)
5. Escalate Composer 2.5 → Opus if requirements ambiguous, security involved, or repeated failures
6. Downgrade to Composer 2.5 after planning completes

## Fallback

- Opus unavailable → GPT-5.5
- GPT unavailable → Opus
- Composer 2.5 unavailable → GPT-5.5

See `docs/MODEL-ROUTING.md` for full cheat sheet.
