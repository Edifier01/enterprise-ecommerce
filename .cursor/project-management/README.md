# Project Management Layer

> Operational source of truth for AI agent coordination between sessions.

## Purpose

Answer for every agent:

- Where are we now?
- What is done / in progress / blocked?
- What decisions constrain this work?
- What did the previous agent do?
- What should happen next?

## Files

| File | Read when | Update when |
|------|-----------|-------------|
| [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md) | Session start (first) | Session end |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Session start | Milestone/progress changes |
| [TASKS.md](TASKS.md) | Session start | Task status changes |
| [DECISIONS.md](DECISIONS.md) | Architecture/domain work | New decision or ADR |
| [HANDOFF.md](HANDOFF.md) | Session start | Session end (always) |

## Quick Start

```
1. Hook injects CURRENT_CONTEXT (sessionStart)
2. Read HANDOFF → TASKS → DECISIONS → PROJECT_STATUS
3. Read PROJECT_ROADMAP.md (strategic context)
4. Run /context-loading
5. Do work — update TASKS during work
6. Before end: update all PM files + optional HANDOFF archive
```

## Enforcement

| Mechanism | Location |
|-----------|----------|
| Always-on rule | `.cursor/rules/core/10-project-state-management.mdc` |
| Context loading skill | `.cursor/skills/context-loading/SKILL.md` |
| Cursor hooks | `.cursor/hooks.json` |
| Verifier checklist | `.cursor/agents/verifier.md` |

## Do Not Duplicate

- **PROJECT_ROADMAP.md** — strategic phases
- **docs/adr/** — full ADRs (DECISIONS.md is index only)
- **Memory MCP** — conventions, not tasks

## Validation

Run: `powershell -File .cursor/scripts/validate-pm-state.ps1`

## Templates

- `templates/11-project-management-template.md`
- `.cursor/templates/project-management-template.md`

## Handoff Archive

Optional: `docs/handoffs/YYYY-MM-DD-agent-name.md` before overwriting HANDOFF.md.
