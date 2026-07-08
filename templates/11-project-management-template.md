# Project Management Template

> Canonical copy — also at `.cursor/templates/project-management-template.md`
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

## HANDOFF Archive (Optional)

Before overwriting `HANDOFF.md`, copy to:

`docs/handoffs/YYYY-MM-DD-agent-name.md`

Keep `HANDOFF.md` as latest only.

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
3. Archive HANDOFF (optional) → docs/handoffs/
4. Update HANDOFF.md (completed work, files changed, next action)
5. Update CURRENT_CONTEXT.md (refresh overview + git branch)
6. Update DECISIONS.md (if decision was made)
7. Create docs/adr/ entry (if architectural decision)
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

See `.cursor/templates/project-management-template.md` for full section templates.
