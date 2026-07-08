---
name: subagent-orchestrator
description: Coordinate parallel Cursor subagents for large multi-file tasks using Composer 2.5/GPT/Opus model routing per project policy.
risk: safe
source: adapted
version: 2.0.0
tags: [subagents, orchestration, parallel, multi-agent, model-routing]
---

# Subagent Orchestrator

> **Project:** Enterprise E-Commerce Platform  
> **Stack:** Next.js + FastAPI + PostgreSQL  
> **Related Rules:** core/08-model-routing, core/07-tool-selection, core/10-project-state-management  
> **Related Agents:** enterprise-architect, backend-engineer, frontend-engineer, qa-engineer, verifier

Coordinate parallel subagents for tasks spanning 3+ files. Uses project model routing: Composer 2.5 (implementation), GPT-5.5 (research/planning), Claude Opus 4.7 (architecture/security).

## Use this skill when

- A task spans 3+ files or components
- Multiple specialists can work in parallel (API + UI + tests)
- Planning and building happen in one mission
- Browser + code + shell agents are needed together

## Do not use this skill when

- Editing a single file or one bug fix
- Writing a quick script under 50 lines
- Planning only with no implementation

---

## Phase 0 — LOAD PROJECT STATE (Parent Agent)

Before Phase 1, parent agent MUST read:

1. `.cursor/project-management/CURRENT_CONTEXT.md`
2. `.cursor/project-management/HANDOFF.md`
3. `.cursor/project-management/TASKS.md` (relevant epic/feature)
4. `.cursor/project-management/DECISIONS.md` (if architecture involved)

Include current phase and blockers in the Mission Brief.

---

## Phase 1 — DECOMPOSE

Before spawning subagents, produce a Mission Brief:

```
MISSION BRIEF
─────────────────────────────────────────
Goal: [one sentence]
Total Agents: [N]
Model Strategy: [COMPOSER / GPT / OPUS / MIXED]
Expected Cost: [LOW / MEDIUM / HIGH]

AGENTS:
[1] ID: agent-001
    Role: [Planner / Builder / Tester / Browser / Verifier]
    Scope: [exact files or URLs]
    Model: [composer-2.5-fast | gpt-5.5-medium | claude-opus-4-8-thinking-high]
    Agent: [.cursor/agents/name if applicable]
    Skills: [skill names]
    MCP: [servers needed]
    Depends on: [none / agent-001]
─────────────────────────────────────────
```

Wait for user approval before proceeding unless the user requested fully autonomous execution.

---

## Phase 2 — MODEL ROUTING

Apply per `core/08-model-routing.mdc`:

```
Architecture / security / payments design?
  → claude-opus-4-8-thinking-high (max 1 subagent per mission)

Research / docs / API comparison / planning?
  → gpt-5.5-medium

CRUD / UI / tests / boilerplate / migrations?
  → composer-2.5-fast (default for builders)

Task > 20 files OR > 500 lines?
  → Composer 2.5 for all builders; Opus for final verifier only

Escalate Composer 2.5 → Opus when:
  - Requirements ambiguous
  - Security or PCI involved
  - Cross-module refactor
  - Repeated implementation failure
```

**Cost rules:**

- Opus: architecture, security audit, verifier — never for bulk CRUD subagents
- GPT-5.5: research and planning subagents
- Composer 2.5: default for implementation, E2E, documentation drafts
- Browser subagent: 1 per mission max; pair with Playwright MCP

---

## Phase 3 — CONTEXT ISOLATION

Each subagent gets a scoped packet:

```
AGENT CONTEXT PACKET — agent-[ID]
Project state: read HANDOFF.md + relevant TASKS.md section
Files to read: [minimal list]
Files to write: [explicit list]
Do NOT read: [node_modules, .next, dist, __pycache__]
Rules: [only relevant .cursor/rules paths]
Skills: [only assigned skills]
MCP: [only required servers]
PM note: subagents do not update PM files — parent aggregates after integration
```

Load only context required per `core/05-context-loading.mdc` and `core/10-project-state-management.mdc`.

---

## Phase 4 — PARALLEL EXECUTION

```
Round 1: Independent agents in parallel (Task tool, single message)
Round 2: Dependent agents after Round 1 artifacts
Round 3: Verifier agent (Opus, readonly) + integration check
```

Between rounds:

1. Collect outputs
2. Check scope, import conflicts, no TODO placeholders
3. Re-run failed agent with corrected context only

---

## Phase 5 — ERROR RECOVERY

1. Do not re-run the full mission
2. Identify exact failure
3. Spawn one repair subagent (Composer 2.5) scoped to broken files
4. Validate before continuing

---

## Phase 6 — INTEGRATION CHECK

- [ ] Imports resolve (Python + TypeScript)
- [ ] No duplicate exports across parallel outputs
- [ ] No secrets hardcoded
- [ ] Types consistent across API contracts
- [ ] FastAPI routes match OpenAPI spec
- [ ] Next.js build would succeed

Spawn verifier subagent (`/verifier`) if any check is uncertain.

---

## Phase 7 — UPDATE PROJECT STATE (Parent Agent)

After Phase 6, parent agent MUST update:

| File | Action |
|------|--------|
| `TASKS.md` | Mark completed subtasks; add new tasks from integration |
| `PROJECT_STATUS.md` | Update progress, active work, next actions |
| `HANDOFF.md` | Aggregate all subagent outputs, files changed, known issues |
| `CURRENT_CONTEXT.md` | Refresh 30-second overview |
| `DECISIONS.md` | If architectural decisions were made |

Archive optional: copy previous HANDOFF to `docs/handoffs/YYYY-MM-DD-mission-slug.md` before overwrite.

---

## E-Commerce Mission Patterns

| Mission | Agents | Models |
|---------|--------|--------|
| Checkout feature | checkout-specialist + backend-engineer + qa-engineer | Opus + Composer 2.5 + Composer 2.5 |
| Catalog CRUD | catalog-specialist + database-engineer | Composer 2.5 + Composer 2.5 |
| Stripe webhooks | checkout-specialist + security-auditor | Opus + Opus |
| Product page UI | frontend-engineer + shadcn skill | Composer 2.5 |
| Full feature | enterprise-architect → implementers → verifier | Opus → Composer 2.5 → Opus |

---

## Limitations

- Does not enforce quota automatically; parent agent monitors cost
- Parallel agents require explicit scoping and integration review
- Cloud subagents use team MCP config at cursor.com/agents, not local mcp.json
