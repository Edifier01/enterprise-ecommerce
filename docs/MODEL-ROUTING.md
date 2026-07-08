# Model Routing Cheat Sheet

Per rule: `.cursor/rules/core/08-model-routing.mdc`

## Models

| Model | Use For |
|-------|---------|
| **Composer 2.5** | CRUD, UI, tests, boilerplate, docs drafts |
| **GPT-5.5** | Research, planning, web search, math, deploy planning |
| **Claude Opus 4.7** | Architecture, security, complex domain, code review |

## Escalation (Composer 2.5 → Opus/GPT)

- Ambiguous requirements
- Architecture changes
- Security / PCI
- Cross-module refactor
- Repeated implementation failure

## Downgrade (after planning)

Move implementation back to Composer 2.5.

## MCP Pairing

| Work | Model | MCP |
|------|-------|-----|
| Research | GPT-5.5 | Context7, Fetch |
| Architecture | Opus | Memory, Context7 |
| Backend | Composer 2.5 | PostgreSQL, OpenAPI |
| Frontend | Composer 2.5 | shadcn, Playwright |
| Testing | Composer 2.5 | Playwright |
| Deploy | GPT-5.5 | Docker, GitHub |
| Prod debug | Opus | Sentry, GitHub |

## Cursor UI Setup

1. Settings → Models: enable Composer 2.5, Opus, GPT-5.5
2. Default daily model: Composer 2.5
3. Max Mode: for Opus architecture tasks
4. Subagents: set `model:` in `.cursor/agents/*.md` (`composer-2.5-fast` for implementation agents)

## Cost Target

Route bulk work to Composer 2.5; reserve Opus for high-value reasoning only.
