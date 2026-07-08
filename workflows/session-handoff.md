# Session Handoff Workflow

---

## Workflow Name

Agent Session Start and Handoff

---

## Purpose

Ensure every Cursor session loads project context, executes work consistently, and leaves PM state updated for the next agent or session.

---

## Trigger

- New chat or agent session start (`sessionStart` hook)
- Agent finishing work (`stop` hook)
- Subagent completing parallel task (`subagentStop` hook)

---

## Participants

| Role | Agent | Model | Skills |
|------|-------|-------|--------|
| Primary | Main Cursor agent | Per model-routing | context-loading, model-routing |
| Parallel work | Domain subagents | Per agent definition | subagent-orchestrator |
| Final check | verifier | Opus | — |

---

## Phases

### Phase 1 — Session Start (mandatory)

**Input:** Hook injects reminder; user task

**Output:** Agent oriented in under 30 seconds

**Checklist:**

- [ ] Read `.cursor/project-management/CURRENT_CONTEXT.md`
- [ ] Read `HANDOFF.md` for previous session output
- [ ] Skim `PROJECT_STATUS.md` and active items in `TASKS.md`
- [ ] Check `DECISIONS.md` before structural changes
- [ ] Run `/context-loading` for non-trivial tasks
- [ ] Run `/model-routing` or `/skill-router` if unsure

### Phase 2 — Execution

**Input:** User task + loaded context

**Output:** Code/docs changes aligned with rules

**Checklist:**

- [ ] Load domain rules (backend, frontend, ecommerce, security as needed)
- [ ] Use domain agent for complex work (`/catalog-specialist`, `/checkout-specialist`, etc.)
- [ ] Follow `09-implementation-efficiency` — minimal focused diffs
- [ ] ADRs rank above PM state for architectural decisions

### Phase 3 — Subagent Aggregation (when using subagents)

**Input:** Subagent results

**Output:** Parent agent merges outcomes

**Checklist:**

- [ ] Parent reads all subagent outputs
- [ ] Resolve conflicts before updating PM state
- [ ] Update TASKS.md with completed/in-progress status

### Phase 4 — Validation

**Input:** Completed work

**Output:** Verified deliverable

**Checklist:**

- [ ] Run relevant tests (pytest, lint, E2E as applicable)
- [ ] Invoke `/verifier` before marking epic/feature done
- [ ] Run `.cursor/scripts/validate-pm-state.ps1` if PM files changed

### Phase 5 — Handoff (mandatory before ending)

**Input:** Validated work

**Output:** Updated PM files for next session

**Checklist:**

- [ ] Update `PROJECT_STATUS.md` — phase, progress, next actions
- [ ] Update `TASKS.md` — checkbox statuses
- [ ] Update `HANDOFF.md` — completed work, files changed, known issues, next action
- [ ] Update `CURRENT_CONTEXT.md` — module, feature, blockers
- [ ] Update `DECISIONS.md` if decision made (link full ADR in `docs/adr/`)
- [ ] Archive long handoffs to `docs/handoffs/` when HANDOFF exceeds ~100 lines

---

## Escalation Rules

- Architectural change → `enterprise-architect` + ADR before implementation
- Security-sensitive module → `security-auditor` before merge
- Blocked task → document in PROJECT_STATUS Blocked Work with mitigation

---

## Related Rules

- `core/10-project-state-management.mdc`
- `core/05-context-loading.mdc`
- `workflow/00-workflow.mdc`

---

## Related Workflows

- `catalog-feature.md`
- `checkout-feature.md`

---

## Summary

Every session: load PM state → work with rules/agents → verify → update all four PM files (+ DECISIONS if needed). Never end a session that changed code without updating HANDOFF.
