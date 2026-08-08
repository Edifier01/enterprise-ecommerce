# Reference Implementation — This Repository

## Purpose

This document shows how the **Enterprise E-Commerce** repository applies the universal AI system.

Use it as a **worked example**, not as a roster to copy blindly.

If your project is not an ecommerce storefront with YooKassa/FastAPI/Next.js, keep the mechanism and replace the domain agents via `SKILLS-TO-AGENTS-PIPELINE.md`.

---

## Stack Context

| Layer | Choice |
|-------|--------|
| Frontend | Next.js App Router, shadcn/ui (`apps/web/`) |
| Backend | FastAPI, DDD modules (`apps/api/`) |
| Database | PostgreSQL + Alembic |
| Payments | YooKassa final (ADR-004); Stripe = legacy prototype |
| Monorepo | pnpm / workspace layout |
| E2E | Playwright |
| Agent host | Cursor (`.cursor/` conventions) |

---

## Folder Map (as implemented)

```text
.cursor/
├── agents/                         # specialist subagents
│   ├── project-orchestrator.md
│   ├── verifier.md
│   ├── enterprise-architect.md
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   ├── database-engineer.md
│   ├── api-engineer.md
│   ├── catalog-specialist.md
│   ├── checkout-specialist.md
│   ├── silent-failure-hunter.md
│   ├── diff-reviewer.md
│   ├── security-auditor.md
│   ├── qa-engineer.md
│   ├── devops-engineer.md
│   └── README.md
├── skills/                         # procedures (40+)
│   ├── start-feature/
│   ├── context-loading/
│   ├── subagent-orchestrator/
│   ├── model-routing/
│   ├── skill-router/
│   ├── implement-checkout-flow/
│   ├── implement-catalog-feature/
│   ├── payment-integration/
│   └── ...
├── rules/                          # mandatory constraints
│   ├── core/
│   ├── architecture/
│   ├── backend/
│   ├── database/
│   ├── ecommerce/
│   └── ...
├── workflows/
│   └── feature-lifecycle.md
├── project-management/             # shared session memory
│   ├── CURRENT_CONTEXT.md
│   ├── PROJECT_STATUS.md
│   ├── TASKS.md
│   ├── DECISIONS.md
│   └── HANDOFF.md
└── hooks.json                      # PM reminders + post-edit quality

docs/
├── MASTER-AI-WORKFLOW.md           # human/agent readable system guide
├── SKILL-MANIFEST.md
├── MODEL-ROUTING.md
├── adr/                            # full ADRs
└── ai-agent-system-bootstrap/      # portable recreate package (this folder)

workflows/                          # domain workflows at repo root
├── catalog-feature.md
├── checkout-feature.md
└── session-handoff.md
```

---

## Why These Agents Exist Here

This roster is the **output** of domain + skills analysis for ecommerce — not a universal default.

| Agent | Why justified in THIS product |
|-------|-------------------------------|
| `project-orchestrator` | Every project needs a planner |
| `verifier` | Every project needs a quality gate |
| `enterprise-architect` | DDD monorepo + ADR culture |
| `backend-engineer` | FastAPI application layer |
| `frontend-engineer` | Next.js storefront + admin UI |
| `database-engineer` | PostgreSQL schema + migrations |
| `api-engineer` | OpenAPI-first contracts |
| `catalog-specialist` | Products/categories/variants are a core domain |
| `checkout-specialist` | Money + YooKassa + orders are a core high-risk domain |
| `security-auditor` | Auth + PCI-adjacent surfaces |
| `qa-engineer` | Playwright checkout/regression |
| `devops-engineer` | Docker + GitHub Actions deploy |
| `silent-failure-hunter` | Payment/webhook/sync paths must not swallow errors |
| `diff-reviewer` | Confidence-gated review before verifier on sensitive diffs |

If you build a clinic booking app, `catalog-specialist` should disappear and something like `booking-specialist` should appear instead.

---

## Skills → Agents Mapping (reference excerpt)

| Skill cluster | Owning agent(s) |
|---------------|-----------------|
| `start-feature`, `context-loading`, `subagent-orchestrator`, `model-routing` | orchestrator / parent workflow |
| `implement-catalog-feature`, `pricing`, inventory skills | `catalog-specialist` (+ db/backend as needed) |
| `implement-checkout-flow`, `payment-integration`, `pci-compliance`, `stripe-integration` (legacy) | `checkout-specialist` |
| `python-fastapi-*`, `openapi-*` | `backend-engineer`, `api-engineer` |
| `nextjs-*`, `shadcn`, `zustand-store-ts`, `zod-validation-expert` | `frontend-engineer` |
| `postgresql*` | `database-engineer` |
| `playwright-e2e-checkout`, `e2e-testing` | `qa-engineer` |
| `docker-expert`, `ci-cd-and-automation` | `devops-engineer` |
| `architecture-decision-records`, `ddd-context-mapping`, `senior-architect` | `enterprise-architect` |
| `cc-skill-security-review`, `security-auditor`, `pci-compliance` | `security-auditor` (+ checkout for PCI implementation) |
| `code-review-checklist` | `diff-reviewer`, `verifier`, `silent-failure-hunter` |

Full routing tables live in:

- `.cursor/skills/skill-router/SKILL.md`
- `docs/SKILL-MANIFEST.md`

---

## Model Routing As Used Here (AI-002)

| Role | Model | Reason |
|------|-------|--------|
| `project-orchestrator` | GPT-5.5 (or Grok 4.5 in bootstrap defaults) | coordination, not deep ADR reasoning |
| Builders (`backend`, `frontend`, `database`, `api`, `qa`, hunters/reviewers) | Composer 2.5 | implementation / checklist review |
| `devops-engineer` | GPT-5.5 / Grok 4.5 | ops planning |
| `enterprise-architect` | Opus | ADR / DDD boundaries |
| `security-auditor` | Opus | auth/PCI/OWASP |
| `checkout-specialist` | Opus | payments high stakes |
| `verifier` | Composer 2.5 | deterministic quality gate; escalate only on real architecture/security findings |

Bootstrap package default language may say "Grok 4.5" for planning. This repo historically also documents GPT-5.5 for the same planning niche. Both are "planning-class" models; pick one policy per project and keep it consistent in agent frontmatter + Feature Plans.

---

## `/start-feature` Path In This Repo

1. Skill: `.cursor/skills/start-feature/SKILL.md`
2. Orchestrator: `.cursor/agents/project-orchestrator.md`
3. Workflow: `.cursor/workflows/feature-lifecycle.md`
4. Execution skill: `.cursor/skills/subagent-orchestrator/SKILL.md`
5. Sensitive chain (payments/auth/PCI): `silent-failure-hunter` → `diff-reviewer` → `verifier`
6. PM updates in `.cursor/project-management/`

Human-readable narrative: `docs/MASTER-AI-WORKFLOW.md`.

---

## Feature Plan Shape (repo-specific)

Domains commonly listed here:

- Frontend / Backend / Database / Testing / Security

Bootstrap-universal plans may also list Mobile / API / AI-Data / DevOps. Prefer the domain axes that match the product.

Payments/auth/HIGH complexity plans in this repo add:

```text
Round 3 (sensitive paths): silent-failure-hunter → diff-reviewer
Round 4: verifier
```

---

## Hooks

`.cursor/hooks.json` enforces operational discipline:

- session start PM reminder;
- post-edit quality reminder;
- stop hook: ensure PM files updated;
- subagentStop: parent aggregates results into PM state.

Hooks are optional for a minimal bootstrap, recommended for multi-agent projects.

---

## What To Copy vs Adapt

### Copy the mechanism

- planning gate + proceed
- orchestrator/verifier split
- PM five-file protocol
- skills inventory before agents
- model cost policy
- Mission Brief scoping
- verifier-before-done

### Adapt to your product

- domain specialists
- skill-router tables
- quality gate checklist items
- rules under `.cursor/rules/`
- MCP set
- verification URLs / environments
- ADR topics

### Do not copy blindly

- `checkout-specialist` into a non-payments product
- YooKassa/Stripe assumptions
- MoySklad sync concerns
- storefront production URL checks
- ecommerce PCI checklist into unrelated apps without re-deriving risk

---

## Minimal Recreate Checklist Using This Reference

1. Read `HOW-THE-SYSTEM-WORKS.md`
2. Run `SKILLS-TO-AGENTS-PIPELINE.md` on **your** skills folder + product brief
3. Generate agents from **your** report (not from the table above)
4. Install mechanism skills: `context-loading`, `start-feature`, `subagent-orchestrator`, `model-routing`
5. Create PM files + roadmap
6. Write `docs/MASTER-AI-WORKFLOW.md` for the new project
7. Pass `VALIDATION-CHECKLIST.md`
8. First command: `/start-feature …` and confirm it waits for `proceed`

---

## Related Source Files Worth Reading

| Topic | Path |
|-------|------|
| Entry skill | `.cursor/skills/start-feature/SKILL.md` |
| Orchestrator | `.cursor/agents/project-orchestrator.md` |
| Verifier | `.cursor/agents/verifier.md` |
| Payments specialist | `.cursor/agents/checkout-specialist.md` |
| Agents index | `.cursor/agents/README.md` |
| Lifecycle | `.cursor/workflows/feature-lifecycle.md` |
| Model rule | `.cursor/rules/core/08-model-routing.mdc` |
| AI behavior rule | `.cursor/rules/ai/00-ai.mdc` |
| PM rule | `.cursor/rules/core/10-project-state-management.mdc` |
| Planning gate | `.cursor/rules/core/11-planning-first.mdc` |
