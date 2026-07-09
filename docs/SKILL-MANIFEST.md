# Skill Manifest — Enterprise E-Commerce Platform

Imported and native skills in `.cursor/skills/`. Use `skill-router` when unsure.

**Tier docs:** [TIER1](TIER1-SKILLS.md) | [TIER2](TIER2-SKILLS.md) | [TIER3-5](TIER3-5-SKILLS.md)

## Native Project Skills

| Skill | Purpose |
|-------|---------|
| `start-feature` | Unified entry point — routes business goal through orchestrator and feature lifecycle |
| model-routing | Model + MCP selection |
| context-loading | Pre-task checklist — Phase 0 mandatory project state load |
| implement-checkout-flow | Checkout + Stripe orchestration |
| implement-catalog-feature | Catalog + inventory |
| playwright-e2e-checkout | E2E checkout tests |

## Imported Skills (41)

### Stack Core
shadcn, python-fastapi-development, fastapi-pro, fastapi-templates, nextjs-app-router-patterns, nextjs-best-practices, react-nextjs-development, postgresql, postgresql-optimization, zod-validation-expert, zustand-store-ts

### E-Commerce
stripe-integration, pci-compliance, payment-integration, inventory-demand-planning, pricing, returns-reverse-logistics

### Architecture & Quality
ddd-context-mapping, architecture-decision-records, software-architecture, backend-architect, senior-architect, cc-skill-security-review, security-auditor, code-review-checklist, cc-skill-coding-standards

### Testing & DevOps
e2e-testing, openapi-spec-generator, openapi-spec-generation, docker-expert, ci-cd-and-automation, git-pr-review

### SEO
seo-audit, seo-technical, frontend-seo, nextjs-seo-indexing, schema-markup

### Orchestration
skill-router, subagent-orchestrator, context7-auto-research, multi-agent-architect

## Task Routing Table

| Task | Primary Skill | Model | MCP | Agent |
|------|---------------|-------|-----|-------|
| New feature (any domain) | start-feature | GPT-5.5 (planning) + Composer 2.5 (impl) | Memory, Context7 | project-orchestrator |
| Checkout + Stripe | stripe-integration | Opus (`claude-opus-4-8-thinking-high`) | postgres, openapi | checkout-specialist |
| PCI review | pci-compliance | Opus | sentry | security-auditor |
| UI component | shadcn | Composer 2.5 | shadcn | frontend-engineer |
| FastAPI endpoint | fastapi-pro | Composer 2.5 | openapi, postgres | backend-engineer |
| Architecture / ADR | architecture-decision-records | Opus | memory, context7 | enterprise-architect |
| Context boundaries | ddd-context-mapping | Opus | memory | enterprise-architect |
| E2E checkout | playwright-e2e-checkout | Composer 2.5 | playwright | qa-engineer |
| Security audit | cc-skill-security-review | Opus | sentry, github | security-auditor |
| DB schema | postgresql | Composer 2.5 | postgres | database-engineer |
| Docs research | context7-auto-research | GPT-5.5 | context7, fetch | — |
| Large parallel task | subagent-orchestrator | Mixed | per agent | — |
| SEO product pages | schema-markup | Composer 2.5 | fetch | — |
| Docker / deploy | docker-expert | GPT-5.5 | docker, github | devops-engineer |

## Invocation

- Auto: agent matches skill description
- Manual: `/skill-name` in chat
- Attach: `@skill-name` as context
