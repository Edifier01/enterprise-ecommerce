# Model Routing Cheat Sheet

Per rule: `.cursor/rules/core/08-model-routing.mdc`

## Models

| Model | Use For |
|-------|---------|
| **Composer 2.5** | CRUD, UI, tests, boilerplate, docs drafts, verification |
| **GPT-5.5** | Research, planning, orchestration, web search, math, deploy planning |
| **Claude Opus** | Architecture/ADR, security/PCI, payments, complex domain |

## Model slug reference

Cursor agent frontmatter uses technical slugs, not display names:

| Display name (docs) | Agent `model:` slug |
|---------------------|---------------------|
| Composer 2.5 | `composer-2.5-fast` |
| GPT-5.5 | `gpt-5.5-medium` |
| Opus 4.7 / Claude Opus | `claude-opus-4-8-thinking-high` |

## Agent Defaults (cost policy — AI-002)

| Opus (reserved) | GPT-5.5 | Composer 2.5 |
|-----------------|---------|--------------|
| enterprise-architect | project-orchestrator | verifier |
| security-auditor | devops-engineer | backend / frontend / database |
| checkout-specialist | | api / catalog / qa |

Per-feature **orchestration and verification never default to Opus**. A COMPLEX
feature routes its deep design/ADR to `enterprise-architect` (Opus); `verifier`
escalates to Opus only when a real architectural/security/PCI concern surfaces.

## Domain: Checkout + Stripe

| Role | Agent | Model |
|------|-------|-------|
| Payments domain lead | `checkout-specialist` | Opus (`claude-opus-4-8-thinking-high`) |
| API / UI implementation | `backend-engineer`, `frontend-engineer` | Composer 2.5 |
| PCI / security audit | `security-auditor` | Opus |

## Code review split

| Review type | Agent / path | Model |
|-------------|--------------|-------|
| Routine (quality gate, tests, PM state) | `verifier` | Composer 2.5 |
| Architectural / security (PCI, auth, payments) | `enterprise-architect` or `security-auditor` | Opus |

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

Route bulk work to Composer 2.5; reserve Opus for high-value reasoning only
(architecture/ADR, security/PCI, payments). Coordination → GPT-5.5, verification →
Composer 2.5. Opus is opt-in on evidence, never the per-feature default.
