---
name: skill-router
description: Route users to the correct project skill for e-commerce, Next.js, FastAPI, payments, SEO, or architecture tasks.
risk: safe
source: adapted
---

# Skill Router — Enterprise E-Commerce Platform

> **Project:** Enterprise E-Commerce Platform  
> **Stack:** Next.js + FastAPI + PostgreSQL  
> **Manifest:** docs/SKILL-MANIFEST.md

Recommend skills from **this project's** `.cursor/skills/` library only.

## When to Use

- User is unsure which skill to use
- Vague goal without clear method
- "What should I use for checkout / API / UI / SEO?"

## Instructions

### Step 1 — Acknowledge

Ask 2–4 funnel questions. Do not recommend skills until answers are clear.

### Step 2 — Funnel

**Q1 — Area:** Building | Debugging | Security | DevOps | SEO/Marketing | Architecture | E-commerce domain

**Q2 — Specificity:** Clear spec | Rough idea | From scratch

**Q3 — Layer:** Frontend (Next.js) | Backend (FastAPI) | Database | Full-stack | Infrastructure

### Step 3 — Recommend

Format:

**Primary:** `/skill-name` — why  
**Secondary:** up to 2 related skills  
**Model:** Composer 2.5 | GPT-5.5 | Opus per core/08-model-routing  
**Agent:** matching `.cursor/agents/` specialist  
**MCP:** required servers

---

## Project Routing Reference

### E-Commerce Domain

| Goal | Primary Skill | Secondary | Agent |
|------|---------------|-----------|-------|
| Stripe checkout | stripe-integration | pci-compliance, implement-checkout-flow | checkout-specialist |
| Payments (generic) | payment-integration | stripe-integration | checkout-specialist |
| Product catalog | implement-catalog-feature | postgresql, ddd-context-mapping | catalog-specialist |
| Inventory / stock | inventory-demand-planning | postgresql-optimization | database-engineer |
| Pricing / promotions | pricing | — | catalog-specialist |
| Returns | returns-reverse-logistics | — | backend-engineer |

### Frontend (Next.js + shadcn)

| Goal | Primary Skill | Secondary | Agent |
|------|---------------|-----------|-------|
| UI components | shadcn | zustand-store-ts | frontend-engineer |
| App Router / RSC | nextjs-app-router-patterns | nextjs-best-practices | frontend-engineer |
| Cart / client state | zustand-store-ts | zod-validation-expert | frontend-engineer |
| Forms / validation | zod-validation-expert | shadcn | frontend-engineer |
| SEO | nextjs-seo-indexing | schema-markup, seo-technical | — |
| E2E tests | playwright-e2e-checkout | e2e-testing | qa-engineer |

### Backend (FastAPI)

| Goal | Primary Skill | Secondary | Agent |
|------|---------------|-----------|-------|
| New API feature | python-fastapi-development | fastapi-pro | backend-engineer |
| Production patterns | fastapi-pro | fastapi-templates | backend-engineer |
| OpenAPI contract | openapi-spec-generator | openapi-spec-generation | api-engineer |
| Database schema | postgresql | postgresql-optimization | database-engineer |
| Migrations | implement-catalog-feature | postgresql | database-engineer |

### Architecture & Quality

| Goal | Primary Skill | Secondary | Agent |
|------|---------------|-----------|-------|
| ADR | architecture-decision-records | software-architecture | enterprise-architect |
| Context boundaries | ddd-context-mapping | — | enterprise-architect |
| System design | senior-architect | backend-architect | enterprise-architect |
| Security review | cc-skill-security-review | pci-compliance, security-auditor | security-auditor |
| Code review | code-review-checklist | cc-skill-coding-standards | verifier |
| Docs lookup | context7-auto-research | — | — |

### DevOps

| Goal | Primary Skill | Secondary | Agent |
|------|---------------|-----------|-------|
| Docker | docker-expert | — | devops-engineer |
| CI/CD | ci-cd-and-automation | git-pr-review | devops-engineer |
| Parallel large task | subagent-orchestrator | multi-agent-architect | — |

### Platform Meta

| Goal | Primary Skill | Secondary |
|------|---------------|-----------|
| Pick model + MCP | model-routing | context-loading |
| Pre-task setup | context-loading | model-routing |

---

## Constraints

- Max 1 primary + 2 secondary skills
- Only recommend installed project skills (see SKILL-MANIFEST.md)
- Default for lost users: `/context-loading` then domain skill
- Offer to compose a full prompt using recommended skill + agent + model
