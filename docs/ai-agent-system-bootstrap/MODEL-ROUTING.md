# Model Routing

## Purpose

Model routing keeps the AI development system accurate, fast, and cost-conscious.

The generated project should use the least expensive model that can complete the task with the required quality.

## Default Models

| Model | Slug | Use for |
|-------|------|---------|
| Composer 2.5 | `composer-2.5-fast` | implementation, CRUD, UI, tests, migrations, routine verification |
| Grok 4.5 | `cursor-grok-4.5-high` | planning, orchestration, research, documentation, comparison, DevOps planning, product/domain analysis |
| Opus | `claude-opus-4-8-thinking-high` | architecture, ADRs, security, payments, compliance, high-risk domain reasoning |

## Default Agent Routing

| Agent type | Default model |
|------------|---------------|
| `project-orchestrator` | Grok 4.5 |
| `devops-engineer` | Grok 4.5 |
| research / documentation agents | Grok 4.5 |
| `verifier` | Composer 2.5 |
| backend/frontend/database/API/QA builders | Composer 2.5 |
| architecture agent | Opus |
| security auditor | Opus |
| payments/billing specialist | Opus |

## Where To Prefer Grok 4.5

Use Grok 4.5 as the default for:

- product and domain analysis during bootstrap;
- skills inventory and agent roster design;
- Feature Plan creation and task decomposition;
- orchestration and specialist routing;
- technical research and library/API comparison;
- documentation drafts that need reasoning, not boilerplate paste;
- DevOps / CI / deployment planning;
- clarifying ambiguous requirements before implementation;
- synthesis of audits, reviews, and multi-agent outputs.

Escalate to Grok 4.5 from Composer 2.5 when:

- the task needs planning or decomposition, not just coding;
- requirements are unclear or conflicting;
- the agent must choose between approaches;
- documentation requires system-level understanding;
- CI/CD or ops planning needs tradeoff reasoning.

Do not use Grok 4.5 as the default for:

- CRUD and repetitive implementation;
- routine UI wiring;
- migrations and boilerplate;
- ordinary pass/fail verification;
- high-stakes security, PCI, payments, or ADR-level architecture — keep those on Opus.

## Bootstrap Routing

When creating the AI system in a new project:

1. Use Grok 4.5 for product analysis, skills inventory, agent design, workflow design, and whole-project planning.
2. Use Composer 2.5 for repetitive file creation once the structure is clear.
3. Use Opus only if the project has architecture, security, compliance, payments, or other high-risk concerns.

## Feature Routing

During `/start-feature`:

```text
Planning and Feature Plan
  -> Grok 4.5 through project-orchestrator

Implementation
  -> Composer 2.5 through scoped specialist agents

Routine verification
  -> Composer 2.5 through verifier

Architecture/security/payments/compliance
  -> Opus through the relevant specialist
```

## Escalation Rules

Escalate from Composer 2.5 to Grok 4.5 when:

- requirements are ambiguous;
- the work needs planning, research, or approach comparison;
- documentation or coordination spans multiple domains;
- DevOps / release planning needs tradeoffs.

Escalate from Composer 2.5 or Grok 4.5 to Opus when:

- the implementation repeatedly fails for architectural reasons;
- the work crosses many modules and needs deep redesign;
- the feature changes architecture;
- the feature touches auth, payments, PII, compliance, or safety;
- a verifier finds a serious architectural or security concern.

## Downgrade Rules

After planning or deep review is complete, move routine implementation back to Composer 2.5.

Do not keep Opus or Grok 4.5 active for:

- CRUD;
- basic UI;
- form wiring;
- boilerplate;
- routine tests;
- formatting;
- ordinary pass/fail verification.

## Feature Plan Requirement

Every Feature Plan must include a model strategy section:

```text
Model Strategy:
  Grok 4.5:     [planning/research/orchestration/docs/devops planning]
  Composer 2.5: [implementation/tests/migrations/verification]
  Opus:         [architecture/security/payments/compliance only if needed]
```

If Opus is listed, the plan must explain why.

## Anti-Patterns

Do not:

- use Opus for the default orchestrator;
- use Opus for the default verifier;
- use Grok 4.5 for bulk CRUD or routine verification;
- route all agents to the same model;
- use the strongest model because the task is large but repetitive;
- avoid escalation when security or payments are involved.
