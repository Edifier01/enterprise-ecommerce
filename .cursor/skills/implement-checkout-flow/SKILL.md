---
name: implement-checkout-flow
description: Implement checkout, cart, YooKassa payments (final; Stripe legacy), webhooks/notifications, and order confirmation following DDD and PCI scope rules.
---

# Implement Checkout Flow

> **Stack:** Next.js + FastAPI + PostgreSQL + YooKassa (final; Stripe = prototype)  
> **Rules:** ecommerce/02-checkout, ecommerce/03-payments, security/02-pci  
> **Skills:** payment-integration, pci-compliance, ddd-context-mapping (stripe-integration = legacy only)  
> **Agents:** checkout-specialist → silent-failure-hunter → diff-reviewer → verifier  
> **MCP:** PostgreSQL, OpenAPI, Sentry  
> **ADR:** ADR-004

## Workflow

### 1. Architecture (Opus)

- Map bounded contexts: Cart, Checkout, Orders, Payments, Inventory
- Use `ddd-context-mapping` for integration contracts
- Define idempotency keys for payment intents
- ADR if changing payment provider or flow

### 2. Backend (Composer 2.5)

- FastAPI: checkout use cases in `apps/api/app/features/checkout/`
- Domain: CheckoutSession aggregate, Order aggregate
- Payments: provider-neutral domain + YooKassa adapter (`payment-integration`); do not grow Stripe surface
- Never store raw card data (PCI — `pci-compliance`)
- Notification/webhook signature verification + idempotent dedupe mandatory
- Create Order only after verified provider success (not redirect)

### 3. Frontend (Composer 2.5)

- Cart state: `zustand-store-ts` in `apps/web/src/store/cart.ts`
- Checkout UI: `shadcn` components
- Server Actions or API client to FastAPI
- Zod validation on forms

### 4. Database

- Orders, order_lines, payment_records tables
- Optimistic locking on inventory reservation
- Migration via Alembic

### 5. Validation

- `/playwright-e2e-checkout` for happy path
- Security-auditor for webhook + auth paths
- Verifier subagent before marking done

## Anti-Patterns

- Business logic in Stripe webhook handler without domain layer
- Double-charge without idempotency
- Client-side price trust without server validation
