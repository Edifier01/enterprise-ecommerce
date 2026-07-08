# Prompt Template

---

## Prompt Name

---

## Purpose

When to use this prompt.

---

## Model

Recommended: Composer 2.5 | GPT-5.5 | Opus

---

## Agent (optional)

`/agent-name`

---

## Skills (optional)

`/skill-name`

---

## Context to Attach

- Rules:
- Files:
- MCP:

---

## Prompt Body

```
[Role and constraints]

Task:
[Specific task description]

Context:
[Project stack, paths, constraints]

Output format:
[Expected deliverable]

Validation:
[How to verify success]
```

---

## Example

```
You are a backend engineer on an enterprise e-commerce platform.
Stack: FastAPI, SQLAlchemy, PostgreSQL in apps/api/.

Task:
Implement POST /api/v1/orders with idempotent checkout.

Follow .cursor/rules/backend/* and ecommerce/02-checkout.
Use /fastapi-pro and /stripe-integration skills.

Output: use case, domain entity, router, tests.
Verify: OpenAPI spec updated, no PCI scope violations.
```

---

## Anti-Patterns

- Vague goals without file paths
- Missing rule/skill references
- No validation criteria

---

## Summary

-
