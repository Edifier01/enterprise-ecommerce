---
name: context-loading
description: Pre-task checklist for loading project state, Rules, Skills, Agents, MCP, and templates before implementation.
---

# Context Loading

> **Rules:** `.cursor/rules/core/05-context-loading.mdc`, `.cursor/rules/core/10-project-state-management.mdc`

---

## Phase 0 — Project Initialization (Mandatory)

Before ANY task, read project state in this order:

1. `.cursor/project-management/CURRENT_CONTEXT.md` — 30-second overview
2. `.cursor/project-management/PROJECT_STATUS.md` — where we are now
3. `.cursor/project-management/TASKS.md` — active and pending work
4. `.cursor/project-management/DECISIONS.md` — architectural constraints
5. `.cursor/project-management/HANDOFF.md` — previous agent actions
6. `PROJECT_ROADMAP.md` — strategic phase context

**Do not skip.** Never select rules, skills, agents, or MCP until project state is loaded.

### Tiered Loading (by task complexity)

| Task type | Required PM reads |
|-----------|-------------------|
| Trivial (typo, 1 file, no logic) | `CURRENT_CONTEXT.md` + `HANDOFF.md` |
| Standard feature / bug fix | All 5 PM files + `PROJECT_ROADMAP.md` |
| Architecture / new module | Above + full `DECISIONS.md` + relevant `docs/adr/` |

Only after Phase 0:

- [ ] Select Rules (matching globs only)
- [ ] Select Skills (one primary domain skill)
- [ ] Select Agent (from `.cursor/agents/` if task spans a domain)
- [ ] Select MCP (enable only what the task requires)

---

## Before Work

Load project state. Understand current phase. Check previous decisions. Check active tasks. Check previous handoff. Identify required expertise.

---

## During Work

Agent must:

- Keep `TASKS.md` updated (status changes, new tasks)
- Record important decisions in `DECISIONS.md` (and create full ADR in `docs/adr/` when architectural)
- Update `PROJECT_STATUS.md` when milestones or phase progress changes

---

## After Work

Before finishing the session, agent MUST update:

| File | When |
|------|------|
| `PROJECT_STATUS.md` | Always — reflect current state |
| `TASKS.md` | Always — mark completed, add new tasks |
| `HANDOFF.md` | Always — transfer context to next agent |
| `DECISIONS.md` | When an architectural or operational decision was made |
| `CURRENT_CONTEXT.md` | Always — refresh 30-second overview |

---

## Context Loading Checklist

After Phase 0 project initialization:

- [ ] **Goal** — user intent, domain, complexity, files involved
- [ ] **Model** — run `/model-routing` or apply `08-model-routing`
- [ ] **Rules** — load only matching globs (backend, frontend, ecommerce, security)
- [ ] **Skills** — one primary domain skill; avoid overlap
- [ ] **Agent** — invoke specialist from `.cursor/agents/` if task spans a domain
- [ ] **MCP** — enable only: PostgreSQL, Context7, Playwright, shadcn, GitHub, Docker, etc. as needed
- [ ] **Memory** — check Memory MCP for existing conventions before new patterns
- [ ] **Templates** — ADR, API spec, migration, project-management template if applicable

---

## Task → Rules Map

| Task | Rules |
|------|-------|
| FastAPI endpoint | backend/*, api/* |
| Next.js page | frontend/* |
| Migration | database/*, backend/07-repositories |
| Checkout | ecommerce/*, security/*, backend/* |
| Security review | security/*, backend/12-security-backend |
| Agent handoff / status update | core/10-project-state-management |

---

## Priority

1. User instructions
2. Core Rules
3. Architecture Rules and ADRs (`docs/adr/`)
4. Project state files (`.cursor/project-management/`)
5. Domain Rules
6. Skills
7. Templates
8. Workflows

Do not load unrelated rules or all 40+ skills at once.

---

## Related

| Resource | Path |
|----------|------|
| Project state rule | `.cursor/rules/core/10-project-state-management.mdc` |
| State files | `.cursor/project-management/` |
| PM template | `.cursor/templates/project-management-template.md` |
| Strategic roadmap | `PROJECT_ROADMAP.md` |
| Full ADRs | `docs/adr/` |
| Memory guide | `docs/MEMORY.md` |
