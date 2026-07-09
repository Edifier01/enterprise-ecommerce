# Orchestrator Implementation Review

> **Historical document (pre-AI-002).** Model assignments in this review (orchestrator
> and verifier on Opus) were superseded by **AI-002** (2026-07-08). See
> `DECISIONS.md`, `docs/MODEL-ROUTING.md`, and `.cursor/agents/README.md` for current policy.

**Date:** 2026-07-08
**Reviewer:** AI Platform Architect (Senior)
**Scope:** Upgrade AI Development Platform from "Cursor with AI tools" to "AI Engineering Team under Project Orchestrator"

---

## 1. Current State

### 1.1 Platform Inventory

| Component | Count | Location |
|-----------|-------|----------|
| Rules | 73 | `.cursor/rules/` |
| Skills | 46 | `.cursor/skills/` |
| Agents | 11 | `.cursor/agents/` |
| MCP servers | 10 | `.cursor/mcp.json` |
| Workflows | 3 | `workflows/` |
| Hooks | 3 | `.cursor/hooks.json` |
| PM state files | 5 | `.cursor/project-management/` |

### 1.2 Existing Agents

| Agent | Role | Model | Coordination |
|-------|------|-------|--------------|
| `enterprise-architect` | Architecture, ADRs, DDD | Opus | readonly |
| `backend-engineer` | FastAPI, use cases | Composer 2.5 | writable |
| `frontend-engineer` | Next.js, shadcn | Composer 2.5 | writable |
| `database-engineer` | PostgreSQL, migrations | Composer 2.5 | writable |
| `api-engineer` | REST, OpenAPI | Composer 2.5 | writable |
| `catalog-specialist` | Products, categories | Composer 2.5 | writable |
| `checkout-specialist` | Cart, Stripe, webhooks | Opus | writable |
| `security-auditor` | Auth, PCI, OWASP | Opus | readonly |
| `qa-engineer` | Playwright, integration | Composer 2.5 | writable |
| `devops-engineer` | Docker, CI/CD | GPT-5.5 | writable |
| `verifier` | Post-implementation check | Opus | readonly |

**Gap:** No **Project Orchestrator** agent. There is no agent whose role is to coordinate other agents, break down features, and run the lifecycle.

### 1.3 Existing Orchestration Mechanisms

| Mechanism | File | Coverage |
|-----------|------|----------|
| Subagent orchestration skill | `.cursor/skills/subagent-orchestrator/SKILL.md` | Parallel multi-agent execution |
| Context loading skill | `.cursor/skills/context-loading/SKILL.md` | Pre-task context load |
| Model routing skill | `.cursor/skills/model-routing/SKILL.md` | Model selection |
| Session handoff workflow | `workflows/session-handoff.md` | Session start/stop |
| PM state hooks | `.cursor/hooks.json` | PM update reminders |
| PM rule | `.cursor/rules/core/10-project-state-management.mdc` | State protocol |

**Gap:** `subagent-orchestrator` handles *parallel execution* but requires the user to decompose the task themselves. There is no agent that receives a business goal and autonomously creates a Feature Plan, selects agents, and manages the lifecycle end-to-end.

### 1.4 Existing Workflows

| Workflow | Path | Scope |
|----------|------|-------|
| Catalog feature | `workflows/catalog-feature.md` | One domain |
| Checkout feature | `workflows/checkout-feature.md` | One domain |
| Session handoff | `workflows/session-handoff.md` | Session protocol |
| Development workflow | `.cursor/rules/workflow/00-workflow.mdc` | General dev process |

**Gap:** No **Feature Lifecycle** workflow that covers the full path from business requirement to verification for *any* feature type (not just catalog or checkout).

### 1.5 Existing Entry Points

Currently, users interact with agents via:
- `/context-loading` — loads PM state
- `/model-routing` — selects model
- `/skill-router` — routes to domain skill
- `/implement-catalog-feature` — catalog-specific
- `/implement-checkout-flow` — checkout-specific
- `/subagent-orchestrator` — parallel multi-agent

**Gap:** No single unified entry point `/start-feature` that:
1. Accepts any business goal
2. Routes through context load → analysis → planning → agent assignment → implementation

### 1.6 Existing Rules — Planning / Quality

| Rule | Path | Applies to |
|------|------|------------|
| Core workflow | `core/03-workflow.mdc` | Summary, references full workflow |
| Full workflow | `workflow/00-workflow.mdc` | Analysis → Completion |
| Implementation efficiency | `core/09-implementation-efficiency.mdc` | Minimal diff |
| Quality standards | `core/04-quality.mdc` | Quality gates |

**Gap:** No explicit rule enforcing **planning before code** as a mandatory pre-condition with exceptions. The workflow rule describes the process, but does not create a hard gate before implementation.

### 1.7 Existing Documentation

| File | Content |
|------|---------|
| `docs/GUIDE.md` | Platform guide (Russian) |
| `docs/SETUP.md` | Setup instructions |
| `docs/MODEL-ROUTING.md` | Model routing cheat sheet |
| `docs/SKILL-MANIFEST.md` | Skills catalog with routing table |

**Gap:** No **MASTER-AI-WORKFLOW.md** that explains how the AI team works from a business feature request perspective. No **PROJECT_BRAIN.md** as a fast context layer.

### 1.8 Verifier Agent — Current State

The verifier (``.cursor/agents/verifier.md``) checks:
- PM state files (TASKS, HANDOFF, PROJECT_STATUS, CURRENT_CONTEXT, DECISIONS)
- Claimed completeness vs actual work
- Runs tests and edge case checks

**Gap:** No structured **Quality Gate checklist** covering Architecture ✓ / Code ✓ / Tests ✓ / Security ✓ / Documentation ✓. The verifier is thorough but its output format is unstructured.

---

## 2. Gap Analysis

| Feature | Required | Exists | Gap |
|---------|----------|--------|-----|
| Project Orchestrator Agent | Yes | No | Missing |
| Feature Lifecycle Workflow | Yes | No | Missing |
| `/start-feature` entry point | Yes | No | Missing |
| Planning-before-code rule | Yes | Partial | Needs new rule |
| MASTER-AI-WORKFLOW doc | Yes | No | Missing |
| PROJECT_BRAIN quick context | Yes | No | Missing |
| Structured Quality Gate | Yes | Partial | Needs enhancement |
| Updated docs reflecting new system | Yes | Partial | Needs update |

---

## 3. Plan of Changes

### 3.1 What Will Be Created

| # | File | Type | Purpose |
|---|------|------|---------|
| 1 | `.cursor/agents/project-orchestrator.md` | New agent | Main feature coordinator — analyzes, plans, routes to specialists |
| 2 | `.cursor/workflows/feature-lifecycle.md` | New workflow | End-to-end feature lifecycle from requirement to verification |
| 3 | `.cursor/skills/start-feature/SKILL.md` | New skill | `/start-feature` user entry point |
| 4 | `.cursor/rules/core/11-planning-first.mdc` | New rule | Mandatory planning gate before implementation |
| 5 | `docs/MASTER-AI-WORKFLOW.md` | New doc | How the AI team works — full team reference |
| 6 | `PROJECT_BRAIN.md` | New doc | Quick context layer (architecture, constraints, strategy) |
| 7 | `docs/reviews/ORCHESTRATOR_FINAL_REVIEW.md` | New review | Post-implementation verification report |

### 3.2 What Will Be Modified

| # | File | Change |
|---|------|--------|
| 1 | `.cursor/agents/verifier.md` | Add structured Quality Gate checklist |
| 2 | `docs/GUIDE.md` | Add orchestrator + `/start-feature` workflow section |
| 3 | `docs/SETUP.md` | Add `/start-feature` to daily workflow |
| 4 | `docs/SKILL-MANIFEST.md` | Add `start-feature` to native skills table and routing table |
| 5 | `docs/MODEL-ROUTING.md` | Add orchestration row |
| 6 | `.cursor/project-management/TASKS.md` | Add new tasks for this epic |
| 7 | `.cursor/project-management/HANDOFF.md` | Update after implementation |

### 3.3 What Will NOT Change

- Application code (`apps/api/`, `apps/web/`)
- Existing 73 rules (no deletion, no modification except the verifier enhancement)
- Existing 11 agents (no deletion)
- Existing 46 skills (no deletion)
- Existing workflows (`workflows/catalog-feature.md`, `checkout-feature.md`, `session-handoff.md`)
- Stack (Next.js + FastAPI + PostgreSQL + Stripe)
- MCP configuration

---

## 4. Files to Be Created

### `.cursor/agents/project-orchestrator.md`

**Role:** Receives a business goal. Does NOT write code. Produces:
1. Feature analysis (complexity, domains, specialists needed)
2. Feature Plan (frontend/backend/database/testing breakdown)
3. Agent Assignment (which specialists, in what order)
4. Tracks progress and triggers verifier

**Model:** Opus (deep reasoning for task decomposition and routing decisions)

**Dependencies:** Uses `context-loading`, `model-routing`, `subagent-orchestrator`, `architecture-decision-records`

### `.cursor/workflows/feature-lifecycle.md`

**Scope:** Universal — works for any feature (catalog, checkout, auth, reviews, etc.)

**Phases:**
```
START → Context Loading → Requirement Analysis → Architecture Review
→ ADR (if needed) → Task Breakdown → Agent Assignment
→ Implementation → Testing → Security Review → Verification
→ Documentation Update → PM State Update → END
```

### `.cursor/skills/start-feature/SKILL.md`

**Trigger:** `/start-feature <business goal>`

**Behavior:**
1. Load project state (mandatory)
2. Pass to `project-orchestrator`
3. Run `feature-lifecycle` workflow
4. Block code without approved plan

### `.cursor/rules/core/11-planning-first.mdc`

**Enforcement:** Before modifying files (except trivial < 10 lines), agent must produce:
- Goal statement
- Affected files
- Architecture approach
- Agent selection
- Risk identification

### `docs/MASTER-AI-WORKFLOW.md`

Full reference document explaining:
- AI team structure
- Agent responsibilities
- Model routing
- Feature development lifecycle
- Example walkthrough

### `PROJECT_BRAIN.md`

Quick context for any agent:
- Architecture decisions
- Tech stack
- Constraints and forbidden patterns
- Active strategy
- Key domain rules

---

## 5. Architecture Decisions

### Decision: project-orchestrator uses Opus

**Rationale:** Task decomposition across multiple domains, agent selection, and risk analysis require deep reasoning. This is not boilerplate work. Composer 2.5 would miss cross-domain dependencies and security considerations in the planning phase.

**Cost justification:** Orchestrator runs once per feature, not per implementation step. Cost is acceptable.

### Decision: start-feature is a skill, not an agent

**Rationale:** Skills are entry points that can invoke agents. Making it a skill allows user invocation via `/start-feature`. It then delegates to `project-orchestrator` (the agent). This preserves the separation between entry point and executor.

### Decision: feature-lifecycle is in `.cursor/workflows/`, not `workflows/`

**Rationale:** `workflows/` at root contains domain-specific application workflows (catalog, checkout). The feature lifecycle is a meta/platform workflow — it belongs in `.cursor/` alongside other platform components. This follows the existing two-tier structure: `.cursor/` = AI platform, `workflows/` = application domain.

**Note:** Existing `session-handoff.md` is in `workflows/` — it is a cross-cutting concern and will stay. New platform workflows go to `.cursor/workflows/`.

### Decision: Do not create a new hook for /start-feature

**Rationale:** Existing `sessionStart` hook already injects `CURRENT_CONTEXT.md`. Adding another hook would increase noise. The start-feature skill handles its own context loading as Phase 0.

---

## 6. Risk Analysis

| Risk | Mitigation |
|------|-----------|
| Orchestrator adds latency vs direct `/implement-*` | Document when to skip orchestrator (trivial tasks < 10 lines) |
| Agents ignoring planning-first rule | Rule is `alwaysApply: false` — only invoked when relevant; exceptions for trivial tasks are explicit |
| Duplicate guidance with subagent-orchestrator | start-feature delegates TO subagent-orchestrator for execution; they complement each other |
| project-orchestrator running Opus on every request | Rule exception: trivial fixes bypass orchestrator; Opus only for feature-level decomposition |

---

## 7. Implementation Sequence

Recommended order to avoid circular dependencies:

1. `11-planning-first.mdc` (rule — no dependencies)
2. `project-orchestrator.md` (agent — references rule)
3. `feature-lifecycle.md` (workflow — references agent and existing rules)
4. `start-feature/SKILL.md` (skill — references workflow and agent)
5. `PROJECT_BRAIN.md` (doc — no dependencies)
6. `MASTER-AI-WORKFLOW.md` (doc — references all above)
7. Enhance `verifier.md` (modification — adds quality gate)
8. Update `GUIDE.md`, `SETUP.md`, `SKILL-MANIFEST.md`, `MODEL-ROUTING.md`
9. `ORCHESTRATOR_FINAL_REVIEW.md` (final review)

---

## Conclusion

The existing platform is well-architected. The 11 agents, 46 skills, 73 rules, and PM layer provide a strong foundation. The gap is a **coordination layer** — something that takes a business goal and autonomously routes it through the team. Seven new/modified artifacts are required. No existing components need to be removed or significantly refactored.

The change is additive: it makes the system smarter at the entry point without touching the working implementation machinery.
