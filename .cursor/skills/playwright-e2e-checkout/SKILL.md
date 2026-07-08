---
name: playwright-e2e-checkout
description: Run Playwright E2E tests for checkout, cart, and authentication flows using Playwright MCP.
---

# Playwright E2E Checkout

> **MCP:** Playwright  
> **Skill:** e2e-testing  
> **Agent:** qa-engineer  
> **Model:** Composer 2.5

## Prerequisites

- Dev servers running: `apps/web` (Next.js), `apps/api` (FastAPI)
- Test Stripe keys in environment
- Playwright MCP enabled in Cursor

## Workflow

1. **Scope** — define user journey (browse → cart → checkout → confirmation)
2. **Data** — seed test product and customer via API or fixtures
3. **Execute** — use Playwright MCP for browser automation
4. **Assert** — order created in DB, payment status, UI confirmation
5. **Report** — failures with screenshot/DOM context

## Standard Scenarios

- Guest checkout
- Registered user checkout
- Empty cart redirect
- Out-of-stock at checkout
- Payment failure handling
- Webhook delayed — polling order status

## Rules

- Tests live in `apps/web/e2e/` or `tests/e2e/`
- No production URLs
- Use test payment methods only (Stripe test cards)
- Idempotent test data cleanup

## Integration

Pair with `implement-checkout-flow` after backend/frontend implementation.

Use `/verifier` if tests pass but business rules unverified.
