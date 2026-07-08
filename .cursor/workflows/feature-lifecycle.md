# Feature Lifecycle Workflow

**Location:** `.cursor/workflows/feature-lifecycle.md`
**Trigger:** `/start-feature <goal>` or direct invocation of `project-orchestrator`
**Scope:** Universal — applies to any feature type (catalog, auth, checkout, reviews, search, etc.)

> This is a platform-level workflow. Domain-specific workflows live in `workflows/` (catalog-feature, checkout-feature).

---

## Purpose

End-to-end lifecycle for any feature: from a business requirement stated in plain language to a verified, documented, production-ready implementation with updated PM state.

---

## Phase Table

| # | Phase | Agent | Condition | Output |
|---|-------|-------|-----------|--------|
| 1 | Context Loading | Main agent | Always | PM state loaded |
| 2 | Requirement Analysis | project-orchestrator | Always | Feature Plan |
| 3 | Architecture Review | enterprise-architect | If ADR required | ADR or "no ADR needed" |
| 4 | ADR Creation | enterprise-architect | If architectural change | `docs/adr/ADR-NNN.md` |
| 5 | Task Breakdown | project-orchestrator | Always | Subtasks added to TASKS.md |
| 6 | Agent Assignment | project-orchestrator | Always | Mission Brief |
| 7 | Implementation | Assigned agents (parallel) | Always | Code + migrations |
| 8 | Testing | qa-engineer | Always | All tests green |
| 9 | Security Review | security-auditor | If auth/payments/PII | Security report |
| 10 | Verification | verifier | Always | Quality Gate passed |
| 11 | Documentation Update | Main agent | If API changed | `openapi.yaml` updated |
| 12 | PM State Update | Main agent | Always | All 5 PM files updated |

---

## Phase Details

### Phase 1 — Context Loading

Run `context-loading` skill Phase 0:

1. `.cursor/project-management/CURRENT_CONTEXT.md`
2. `.cursor/project-management/HANDOFF.md`
3. `.cursor/project-management/TASKS.md`
4. `.cursor/project-management/DECISIONS.md`
5. `.cursor/project-management/PROJECT_STATUS.md`

Do not proceed to Phase 2 without loading all 5 files.

---

### Phase 2 — Requirement Analysis

Invoke `project-orchestrator` with the business goal.

Outputs:
- Feature complexity: LOW / MEDIUM / HIGH
- Domains affected
- Feature Plan (formatted)
- Agent assignments

Present Feature Plan to user. Wait for explicit confirmation.

---

### Phase 3 — Architecture Review

**Condition:** Feature Plan contains `ADR required: YES`

Invoke `enterprise-architect`:
- Review proposed domain structure
- Validate DDD layer compliance
- Identify breaking changes
- Confirm or revise agent assignments

Outputs: architecture review note, ADR draft if needed.

**Skip if:** Feature Plan contains `ADR required: NO`.

---

### Phase 4 — ADR Creation

**Condition:** Phase 3 confirms architectural change

`enterprise-architect` creates:
- `docs/adr/ADR-NNN-feature-name.md` following `architecture/06-adr.mdc`
- Entry in `.cursor/project-management/DECISIONS.md`

**Skip if:** No architectural change confirmed in Phase 3.

---

### Phase 5 — Task Breakdown

`project-orchestrator` adds subtasks to `TASKS.md`:

```
### Feature: [Name]
Status: IN_PROGRESS

- [ ] [Backend task]
- [ ] [Frontend task]
- [ ] [Database migration]
- [ ] [Tests]
- [ ] [Security review if applicable]
- [ ] [openapi.yaml update if applicable]
```

---

### Phase 6 — Agent Assignment

`project-orchestrator` produces Mission Brief for `subagent-orchestrator`:

```
MISSION BRIEF
─────────────────────────────────────────
Goal: [one sentence from Feature Plan]
Total Agents: [N]
Model Strategy: [from Feature Plan]

AGENTS:
[1] ID: agent-001
    Role: [role]
    Scope: [exact files]
    Model: [model slug]
    Agent: [.cursor/agents/name]
    Skills: [skill names]
    MCP: [servers]
    Depends on: [none / agent-ID]
─────────────────────────────────────────
```

---

### Phase 7 — Implementation

`subagent-orchestrator` executes:

- **Round 1 (parallel):** Agents without inter-dependencies
- **Round 2 (sequential):** Agents depending on Round 1 outputs
- Each agent follows DDD: domain → application → infrastructure → presentation

Constraints per agent:
- Read only assigned files
- No imports across domain boundaries
- No hardcoded secrets
- No synchronous SQLAlchemy
- No float for money (use int cents)

---

### Phase 8 — Testing

`qa-engineer`:
- Run `python -m pytest apps/api/tests/ -v`
- Run `npx tsc --noEmit` in `apps/web/`
- Write new tests for new logic
- Add E2E test if user-facing flow changed

All tests must be green before Phase 9/10.

---

### Phase 9 — Security Review

**Condition:** Feature involves auth, payments, PII, or new external integrations

`security-auditor` (readonly) checks:
- Auth guards on new endpoints
- No plain-text credentials
- PCI scope not expanded unintentionally
- Sensitive data not logged
- OWASP Top 10 applicable items

**If critical issue found:** STOP, report to user before continuing to Phase 10.

**Skip if:** No auth, payments, or PII involved.

---

### Phase 10 — Verification

`verifier` (readonly) runs the Quality Gate Checklist:

- Architecture: DDD layers, IRepository in use cases, no circular imports
- Code Quality: ruff passes, tsc passes, no secrets, no TODO in production
- Tests: existing tests pass, new logic has tests
- Security: no plain-text passwords, auth guards present
- Documentation: openapi.yaml updated, PM state current

Reports: ✅ PASSED / ⚠️ PASSED WITH NOTES / ❌ FAILED

**If FAILED:** Fix issues, re-run Phase 10. Do not mark feature done.

---

### Phase 11 — Documentation Update

**Condition:** API endpoints were added or changed

Main agent updates `openapi.yaml`:
- Add new paths and schemas
- Follow existing `openapi.yaml` conventions
- Run `openapi` MCP validation if available

**Skip if:** No API changes.

---

### Phase 12 — PM State Update

Main agent updates all 5 PM files:

| File | Update |
|------|--------|
| `TASKS.md` | Mark completed subtasks, add any discovered follow-up tasks |
| `HANDOFF.md` | Files changed, known issues, next recommended action |
| `PROJECT_STATUS.md` | Progress percentage, active work, last updated date |
| `CURRENT_CONTEXT.md` | Current module, feature, blockers |
| `DECISIONS.md` | If an architectural decision was made (link to ADR) |

---

## Phase Skip Rules

| Phase | Skip condition |
|-------|----------------|
| Phase 3 (Architecture Review) | Feature Plan has `ADR required: NO` |
| Phase 4 (ADR Creation) | No architectural change confirmed |
| Phase 9 (Security Review) | No auth, payments, or PII involved |
| Phase 11 (Documentation) | No API changes |

Phases 1, 2, 5, 6, 7, 8, 10, 12 are **never** skipped.

---

## Escalation Rules

| Situation | Action |
|-----------|--------|
| Phase 7 subagent failure | Error Recovery: subagent-orchestrator Phase 5 — spawn repair agent |
| Phase 9 critical security issue | STOP — report to user before Phase 10 |
| Phase 10 FAILED | Fix all failing checks, re-run Phase 10 |
| Requirements conflict with existing ADR | STOP — escalate to `enterprise-architect` |

---

## Related

- Skill: `start-feature` — entry point that triggers this workflow
- Skill: `subagent-orchestrator` — executes Phases 6–7
- Skill: `context-loading` — Phase 1 implementation
- Agent: `project-orchestrator` — Phases 2, 5, 6
- Agent: `enterprise-architect` — Phases 3, 4
- Agent: `verifier` — Phase 10
- Agent: `security-auditor` — Phase 9
- Agent: `qa-engineer` — Phase 8
- Workflow: `workflows/session-handoff.md` — session start/stop protocol
- Rule: `core/10-project-state-management.mdc` — Phase 12 protocol
- Rule: `core/11-planning-first.mdc` — planning gate between Phases 2 and 7
