# Checkout Feature Workflow

---

## Workflow Name

Checkout and Payments Implementation

---

## Purpose

Implement cart, checkout session, provider-backed payments, webhooks/notifications, and order confirmation following PCI scope rules and idempotency standards. The final project payment provider is YooKassa per ADR-004.

---

## Trigger

- Cart or checkout session work
- Payment provider integration (YooKassa for the final project gate)
- Order placement flow
- Payment-related OpenAPI changes

---

## Participants

| Role | Agent | Model | Skills |
|------|-------|-------|--------|
| Lead | checkout-specialist | Opus | implement-checkout-flow, payment-integration |
| Security | security-auditor | Opus | pci-compliance, cc-skill-security-review |
| Backend | backend-engineer | Composer 2.5 | python-fastapi-development, payment-integration |
| Frontend | frontend-engineer | Composer 2.5 | shadcn, zustand-store-ts |
| QA | qa-engineer | Composer 2.5 | playwright-e2e-checkout, e2e-testing |
| Validation | verifier | Composer 2.5 | — |

---

## Phases

### Phase 1 — Analysis

**Input:** TASKS.md item, `ecommerce/02-checkout`, `ecommerce/03-payments`, `security/02-pci`

**Output:** Flow diagram — cart → checkout → payment → provider notification → order

**Checklist:**

- [ ] Confirm PCI scope and hosted/provider-side card-data handling
- [ ] Identify idempotency keys and provider notification events
- [ ] Read DECISIONS.md and payment ADRs if any

### Phase 2 — Planning

**Input:** Analysis output

**Output:** Feature module plan under `apps/api/app/features/checkout/` and `payments/`

**Checklist:**

- [ ] Define order state machine per `ecommerce/04-orders`
- [ ] Plan webhook handler with signature verification
- [ ] Plan frontend checkout UI (Server + Client Components split)

### Phase 3 — Implementation

**Input:** Approved plan

**Output:** End-to-end checkout path (test mode)

**Checklist:**

- [ ] Cart session / checkout session API
- [ ] Provider payment creation (server-side only)
- [ ] Provider notification handler with idempotency store
- [ ] Order creation only after verified provider success notification
- [ ] Frontend checkout page using provider-approved hosted/confirmation flow
- [ ] Never log or store PAN/CVV

### Phase 4 — Validation

**Input:** Implementation

**Output:** Tests + security review + E2E smoke

**Checklist:**

- [ ] Unit/integration tests for checkout use cases
- [ ] `/security-auditor` for PCI scope review
- [ ] Playwright E2E: add to cart → checkout → confirmation (test keys)
- [ ] `/verifier` before marking done

### Phase 5 — Documentation

**Input:** Validated implementation

**Output:** Updated PM state, OpenAPI, runbook notes

**Checklist:**

- [ ] Update TASKS.md, PROJECT_STATUS.md, HANDOFF.md, CURRENT_CONTEXT.md
- [ ] Document webhook setup in SETUP.md if changed
- [ ] ADR for payment architecture if new decision

---

## Escalation Rules

- PCI scope expansion risk → stop and invoke `security-auditor` before proceeding
- Order/inventory coupling → coordinate with `catalog-specialist` and `database-engineer`
- CI/deploy changes → invoke `devops-engineer`

---

## Related Rules

- `ecommerce/02-checkout.mdc`, `ecommerce/03-payments.mdc`, `ecommerce/04-orders.mdc`
- `security/02-pci.mdc`, `security/01-auth.mdc`
- `backend/*`, `api/*`

---

## Related Workflows

- `catalog-feature.md` — product data for cart
- `session-handoff.md` — PM updates between sessions

---

## Summary

Checkout is security-critical: design with PCI rules first, implement server-side payment logic, validate with security-auditor and Playwright E2E before completion.
