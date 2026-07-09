---
name: start-feature
description: >
  Main entry point for any new feature. Accepts a business goal and routes it
  through Context Loading → Project Orchestrator → Feature Lifecycle Workflow.
  Prevents code writing without an approved plan.
---

# Start Feature

> **Trigger:** `/start-feature <business goal>`
> **Example:** `/start-feature добавить систему отзывов товаров`

The unified entry point for any new feature on the Enterprise E-Commerce Platform. Accepts a plain-language business goal and guides it through the complete Feature Lifecycle: context load → analysis → planning → agent execution → verification → PM update.

---

## When to use

- Starting any new feature, regardless of domain
- When unsure which agent or skill to use
- When a task spans multiple domains (backend + frontend + database)
- When you want automated agent routing and planning

## When NOT to use

- Typo or single-line comment fix → edit directly
- Single-file patch under 10 lines with no logic change → edit directly + update HANDOFF
- PM state file update only → update directly
- You already have a Feature Plan and need to resume execution → use `subagent-orchestrator`

---

## Phase 0 — Mandatory Context Load

**Always run first. Never skip.**

Read all 5 PM state files in this order:

1. `.cursor/project-management/CURRENT_CONTEXT.md` — current module and blockers
2. `.cursor/project-management/HANDOFF.md` — previous agent actions and known issues
3. `.cursor/project-management/TASKS.md` — active and backlog tasks
4. `.cursor/project-management/DECISIONS.md` — architectural constraints
5. `.cursor/project-management/PROJECT_STATUS.md` — current phase and milestones

Do not proceed to Phase 1 without completing Phase 0.

---

## Phase 1 — Goal Assessment

Evaluate the stated goal:

- **Clear goal** ("add product reviews", "implement cart", "add search") → proceed to Phase 2
- **Unclear goal** → ask at most 2 clarifying questions, then proceed to Phase 2

Clarifying question examples:
- "Which domain does this affect? (catalog / checkout / auth / new)"
- "Should this be user-facing, admin-only, or both?"

Do not ask more than 2 questions. If still unclear after answers, classify as STANDARD and proceed.

---

## Phase 2 — Complexity Classification

Classify the feature before routing:

```
TRIVIAL — bypass orchestrator:
  Criteria: 1 file, <10 lines, no logic change
  Action: execute directly, then update PM state

STANDARD:
  Criteria: 1–3 files OR 1–2 domains, no architectural changes
  Action: Feature Plan → 2–4 subagents → verifier

COMPLEX:
  Criteria: 4+ files OR 3+ domains OR architectural changes
             OR new external integrations
             OR touches payments / auth / PCI
  Action: enterprise-architect first → ADR → Feature Plan → subagents → verifier
```

---

## Phase 3 — Feature Plan

Pass the goal and complexity classification to `project-orchestrator`.

`project-orchestrator` produces a Feature Plan in this format:

```
FEATURE PLAN
─────────────────────────────────────────
Feature: [name]
Complexity: LOW | MEDIUM | HIGH
ADR required: YES | NO (reason)

Domains affected:
  Frontend:  [components/pages or "none"]
  Backend:   [endpoints/use cases or "none"]
  Database:  [models/migrations or "none"]
  Testing:   [API tests / E2E tests / "none"]
  Security:  [auth/PCI concerns or "none"]

Agent Assignment:
  [agent-name] → [specific task]
  [agent-name] → [specific task]

Model Strategy (cost-optimized, AI-002):
  Composer 2.5: implementation, tests, migrations, verification (default)
  GPT-5.5:      orchestration/planning, research, documentation
  Opus:         ONLY for COMPLEX — enterprise-architect (ADR/deep design),
                security-auditor (auth/PCI), checkout-specialist (payments)

Execution:
  Round 1 (parallel): [agents without dependencies]
  Round 2 (sequential): [agents depending on Round 1]
  Round 3: verifier

Risks:
  - [risk and mitigation]

Estimated effort: S | M | L
─────────────────────────────────────────
```

Present the Feature Plan to the user.

**WAIT for explicit continuation before Phase 4.**

Accepted signals: "proceed", "ok", "да", "go ahead", "yes", or any next instruction.
Do NOT begin implementation automatically after showing the plan.

---

## Phase 4 — Execution

After user confirmation:

1. If ADR required → invoke `enterprise-architect` first
2. Invoke `feature-lifecycle` workflow
3. Pass Mission Brief from the Feature Plan to `subagent-orchestrator`
4. `subagent-orchestrator` executes parallel and sequential rounds as specified

---

## Phase 5 — Verification

After all subagents complete:

Invoke `verifier` with:
- The Feature Plan
- Files changed (from subagent outputs)
- Current TASKS.md and HANDOFF.md state

`verifier` runs the Quality Gate Checklist.
Do not mark the feature done until `verifier` reports ✅ PASSED or ⚠️ PASSED WITH NOTES.

---

## Phase 6 — PM Update

Update all 5 PM state files:

| File | Update |
|------|--------|
| `TASKS.md` | Mark completed subtasks; add any discovered follow-up tasks |
| `HANDOFF.md` | Files changed, known issues, next recommended action |
| `PROJECT_STATUS.md` | Progress %, active work, last updated date (today) |
| `CURRENT_CONTEXT.md` | Current module, active feature, blockers |
| `DECISIONS.md` | If an architectural decision was made (+ link to ADR) |

---

## Invocation Examples

```
/start-feature добавить систему отзывов товаров
/start-feature реализовать корзину покупателя
/start-feature добавить поиск по каталогу
/start-feature создать страницу заказа
/start-feature добавить категории товаров
/start-feature frontend login / register forms
/start-feature Stripe checkout integration
```

---

## Anti-patterns

Never do the following:

- Start writing code before showing the Feature Plan (violates `core/11-planning-first`)
- Launch all 11 agents for every task (wasteful; assign only what is needed)
- Skip Phase 0 context loading (causes stale decisions, duplicate work)
- Create ADR for trivial changes (< 3 files, no domain changes)
- Mark a feature done without running `verifier`

---

## Related

| Resource | Path |
|----------|------|
| Feature lifecycle | `.cursor/workflows/feature-lifecycle.md` |
| Orchestrator agent | `.cursor/agents/project-orchestrator.md` |
| Context loading | `.cursor/skills/context-loading/SKILL.md` |
| Subagent execution | `.cursor/skills/subagent-orchestrator/SKILL.md` |
| Verifier | `.cursor/agents/verifier.md` |
| Planning rule | `.cursor/rules/core/11-planning-first.mdc` |
| PM state rule | `.cursor/rules/core/10-project-state-management.mdc` |
| Full dev workflow | `.cursor/rules/workflow/00-workflow.mdc` |
| AI team reference | `docs/MASTER-AI-WORKFLOW.md` |
