# Universal AI Agent System Bootstrap Prompt

This single-file entry point points to the multi-document package that an agent can read end-to-end to recreate the AI development system.

## Start here

`docs/ai-agent-system-bootstrap/README.md`

## Full package (read in order)

1. `docs/ai-agent-system-bootstrap/HOW-THE-SYSTEM-WORKS.md` — how the system works (layers, orchestrator, routing, flows)
2. `docs/ai-agent-system-bootstrap/SKILLS-TO-AGENTS-PIPELINE.md` — **mandatory**: analyze skills → create project-specific subagents
3. `docs/ai-agent-system-bootstrap/REFERENCE-IMPLEMENTATION.md` — worked example from this ecommerce repo (do not clone blindly)
4. `docs/ai-agent-system-bootstrap/BOOTSTRAP-PROMPT.md` — prompt to paste into the new project
5. `docs/ai-agent-system-bootstrap/AGENT-SYSTEM-SPEC.md`
6. `docs/ai-agent-system-bootstrap/PROJECT-PLANNING-AND-COORDINATION.md`
7. `docs/ai-agent-system-bootstrap/START-FEATURE-WORKFLOW.md`
8. `docs/ai-agent-system-bootstrap/MODEL-ROUTING.md`
9. `docs/ai-agent-system-bootstrap/TEMPLATES.md`
10. `docs/ai-agent-system-bootstrap/VALIDATION-CHECKLIST.md`

## How to use in a new project

1. Attach / copy the whole `docs/ai-agent-system-bootstrap/` folder.
2. Paste your application logic into the prompt template in `BOOTSTRAP-PROMPT.md`.
3. Tell the agent: follow the reading order; **do not create domain agents until the Skills→Agents Report passes**.
4. After bootstrap, start work with `/start-feature …` and wait for `proceed`.

## Non-negotiable

- Reproduce the **mechanism** (start-feature, plan, proceed, subagents, verifier, PM state, model routing).
- Derive agents from **this project's** skills + domains.
- Do not copy ecommerce specialists unless those domains exist.
