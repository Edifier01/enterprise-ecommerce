# Project Management Template

> Standard structure for agent coordination state files.
> Location: `.cursor/project-management/`
> Rule: `.cursor/rules/core/10-project-state-management.mdc`

---

## When to Use

- Starting a new agent session
- Ending an agent session (update all applicable sections)
- Recording a new task, decision, or handoff
- Onboarding a new agent to the project

---

## File Index

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `CURRENT_CONTEXT.md` | 30-second overview | Every session |
| `PROJECT_STATUS.md` | Current state snapshot | Every session |
| `TASKS.md` | Master task registry | During and after work |
| `DECISIONS.md` | Decision index | When decisions are made |
| `HANDOFF.md` | Agent-to-agent transfer | Every session |

---

## CURRENT_CONTEXT.md Template

```markdown
# Current Context

## Current Module

## Current Feature

## Active Agent

## Current Branch

## Current Milestone

## Current Blockers

## Progress Snapshot

| Area | Status |
|------|--------|
| | |

## Important References

| Resource | Path | Purpose |
|----------|------|---------|
| | | |

## Last Updated

YYYY-MM-DD
```

---

## PROJECT_STATUS.md Template

```markdown
# Project Status

## Current Phase

## Current Objective

## Current Sprint

## Progress

## Completed Work

- [x]

## Active Work

- [ ]

## Blocked Work

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|

## Next Actions

1.

## Last Updated

YYYY-MM-DD

## Last Agent
```

---

## TASKS.md Template

```markdown
# Tasks

> Statuses: BACKLOG · PLANNED · IN_PROGRESS · REVIEW · COMPLETED · BLOCKED

## Epic: [Name]

**Status:** BACKLOG | PLANNED | IN_PROGRESS | REVIEW | COMPLETED | BLOCKED

### Feature: [Name]

**Status:** [STATUS]

- [ ] Task description
- [x] Completed task

## Technical Tasks

## Bugs

## Improvements
```

---

## DECISIONS.md Template

```markdown
## [ADR-NNN or PM-NNN]

| Field | Value |
|-------|-------|
| **Decision ID** | |
| **Date** | YYYY-MM-DD |
| **Status** | Proposed / Approved / Deprecated / Superseded |
| **Full ADR** | `docs/adr/ADR-NNN-title.md` or N/A |

**Context:**

**Decision:**

**Alternatives Considered:**

| Alternative | Reason Rejected |
|-------------|-----------------|

**Consequences:**

**Related Rules:**
```

---

## HANDOFF.md Template

```markdown
# Handoff

## Current Agent

## Previous Agent

## Completed Work

-

## Files Changed

| File | Action |
|------|--------|

## Known Issues

-

## Next Recommended Action

1.

## Session Notes
```

---

## Agent Workflow

### Session Start

```
1. Read CURRENT_CONTEXT.md
2. Read PROJECT_STATUS.md
3. Read TASKS.md
4. Read DECISIONS.md
5. Read HANDOFF.md
6. Read PROJECT_ROADMAP.md
7. Select rules, skills, agent, MCP
```

### Session End

```
1. Update TASKS.md (statuses, new items)
2. Update PROJECT_STATUS.md (progress, next actions)
3. Update HANDOFF.md (completed work, files changed, next action)
4. Update CURRENT_CONTEXT.md (refresh overview)
5. Update DECISIONS.md (if decision was made)
6. Create docs/adr/ entry (if architectural decision)
```

---

## Relationship to Other Documentation

| System | Scope | Location |
|--------|-------|----------|
| Project Management | Operational — current state, tasks, handoffs | `.cursor/project-management/` |
| Roadmap | Strategic — phases and completion criteria | `PROJECT_ROADMAP.md` |
| ADRs | Architectural — full decision records | `docs/adr/` |
| Memory MCP | Conventions — naming, boundaries, choices | `docs/MEMORY.md` + Memory MCP |

Do not duplicate content across systems. Cross-reference instead.

---

## Related Rules

- `core/05-context-loading.mdc`
- `core/10-project-state-management.mdc`
- `architecture/06-adr.mdc`
- `workflow/00-workflow.mdc`

---

## Related Skills

- `context-loading`
- `architecture-decision-records`
