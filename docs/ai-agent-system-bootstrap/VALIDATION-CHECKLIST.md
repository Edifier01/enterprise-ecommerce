# Validation Checklist

## Purpose

Use this checklist after the bootstrap agent creates the AI development system in a new project.

The system is acceptable only if it is tailored to the project's logic and preserves the required orchestration workflow.

## Bootstrap Analysis

- [ ] The agent read the application logic.
- [ ] The agent identified project type.
- [ ] The agent identified user roles.
- [ ] The agent identified core business domains.
- [ ] The agent identified admin/backoffice workflows, if any.
- [ ] The agent identified external integrations.
- [ ] The agent identified security, privacy, payment, compliance, or safety risks.
- [ ] The agent identified the technical stack or documented that it is unknown.

## Skills Inventory (HARD GATE)

- [ ] The agent read `SKILLS-TO-AGENTS-PIPELINE.md` and followed it.
- [ ] The agent inspected the full `skills` folder (all locations).
- [ ] The agent read relevant `SKILL.md` bodies, not filenames only.
- [ ] The agent produced a Skills→Agents Report before writing domain agents.
- [ ] The agent built a Domain Map for THIS product.
- [ ] The agent summarized available skills.
- [ ] The agent selected only project-relevant skills.
- [ ] Deferred/rejected skills have one-line reasons.
- [ ] Each selected skill has a reason.
- [ ] Skills were clustered by ownership before agent creation.
- [ ] Each selected skill is mapped to one or more agents (or marked on-demand utility).
- [ ] No agent is allowed to use all skills by default.
- [ ] Typical agent skill count stays intentional (about 3–7), not a dump.
- [ ] Agent names use THIS product's language (no blind ecommerce roster clone).

## Agent Roster

- [ ] `.cursor/agents/project-orchestrator.md` exists.
- [ ] `project-orchestrator` is readonly.
- [ ] `project-orchestrator` uses Grok 4.5 by default.
- [ ] `.cursor/agents/verifier.md` exists.
- [ ] `verifier` is readonly.
- [ ] `verifier` uses Composer 2.5 by default.
- [ ] Domain agents exist only where justified by product logic.
- [ ] Every agent has a clear responsibility.
- [ ] Every agent has allowed skills.
- [ ] Every agent has allowed rules.
- [ ] Every agent has model routing.
- [ ] Every agent has escalation rules.
- [ ] Every agent has an output format.
- [ ] No "misc", "everything", or unnecessary agents were created.

## Start Feature Workflow

- [ ] `.cursor/skills/start-feature/SKILL.md` exists.
- [ ] `/start-feature <business goal>` is documented.
- [ ] Context loading happens before planning.
- [ ] Complexity classification exists.
- [ ] Feature Plan format exists.
- [ ] Feature Plan includes affected domains.
- [ ] Feature Plan includes agent assignment.
- [ ] Feature Plan includes model strategy.
- [ ] Feature Plan includes execution rounds.
- [ ] Feature Plan includes risks.
- [ ] Feature Plan includes validation.
- [ ] The workflow explicitly waits for `proceed`.
- [ ] Implementation cannot start before confirmation.

## Project Management State

- [ ] `PROJECT_ROADMAP.md` or `docs/PROJECT_PLAN.md` exists.
- [ ] `.cursor/project-management/CURRENT_CONTEXT.md` exists.
- [ ] `.cursor/project-management/PROJECT_STATUS.md` exists.
- [ ] `.cursor/project-management/TASKS.md` exists.
- [ ] `.cursor/project-management/DECISIONS.md` exists.
- [ ] `.cursor/project-management/HANDOFF.md` exists.
- [ ] `TASKS.md` contains project-level epics, features, statuses, owners/scopes, and validation criteria.
- [ ] Agents are instructed to read project state before work.
- [ ] Parent agent is responsible for updating project state after work.

## Agent Coordination

- [ ] The system defines file/domain ownership before parallel work.
- [ ] Parallel agents do not edit the same files.
- [ ] Shared files are edited sequentially or by one owner agent.
- [ ] Subagents receive explicit `May read`, `May edit`, and `Must not edit` scopes.
- [ ] Subagents return handoff notes to the parent agent.
- [ ] Parent agent owns final integration and shared PM-state updates.
- [ ] Blocked work is marked `BLOCKED` with unblock criteria.
- [ ] Tasks are marked `COMPLETED` only after verifier evidence.

## Model Routing

- [ ] Grok 4.5 is used for planning, orchestration, research, docs, product/domain analysis, and DevOps planning.
- [ ] `devops-engineer` and research/documentation agents default to Grok 4.5 when present.
- [ ] Composer 2.5 is used for implementation, tests, migrations, and routine verification.
- [ ] Opus is reserved for architecture, security, payments, compliance, and high-risk reasoning.
- [ ] Opus is not the default for `project-orchestrator`.
- [ ] Opus is not the default for `verifier`.
- [ ] Grok 4.5 is not the default for bulk CRUD or routine verification.
- [ ] Escalation rules are documented.
- [ ] Downgrade rules are documented.

## Workflow And Documentation

- [ ] `.cursor/workflows/feature-lifecycle.md` exists.
- [ ] `docs/MASTER-AI-WORKFLOW.md` exists.
- [ ] `.cursor/agents/README.md` lists generated agents.
- [ ] The system explains how to start the first feature.
- [ ] The system explains how to plan the whole project before feature work.
- [ ] The system explains how agents avoid overwriting each other's work.
- [ ] The system explains when to create ADRs.
- [ ] The system explains how verifier reports pass/fail.

## Acceptance Test

Ask the generated system to plan a first feature:

```text
/start-feature [first real business feature]
```

Pass criteria:

- [ ] It produces a Feature Plan instead of writing code.
- [ ] It lists agents.
- [ ] It lists models.
- [ ] It lists execution rounds.
- [ ] It lists risks.
- [ ] It asks for or waits for `proceed`.

Fail criteria:

- [ ] It starts coding immediately.
- [ ] It assigns every agent.
- [ ] It ignores the `skills` folder.
- [ ] It creates agents before the Skills→Agents Report.
- [ ] It copies `catalog-specialist` / `checkout-specialist` without those domains.
- [ ] It omits model routing.
- [ ] It skips verifier.
- [ ] It creates generic agents unrelated to the project.

## Final Bootstrap Report

The bootstrap agent should finish with:

```text
Bootstrap Result:
- Project type:
- Main domains:
- Skills inspected:
- Skills selected:
- Skills rejected (with reasons):
- Skills→Agents Report: PASS | FAIL
- Agents created (each tied to domain/skill cluster):
- Models assigned:
- Workflows created:
- PM files created:
- Validation status:
- Remaining risks:
- First recommended /start-feature command:
```

