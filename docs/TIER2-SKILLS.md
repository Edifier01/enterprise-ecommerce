# Tier 2 Skills — E-Commerce Domain

Payment, catalog economics, and fulfillment skills for the enterprise store.

| Skill | Purpose | Agent |
|-------|---------|-------|
| stripe-integration | Stripe checkout, webhooks, subscriptions | checkout-specialist |
| pci-compliance | PCI DSS scope, tokenization | security-auditor |
| payment-integration | Generic payment patterns | checkout-specialist |
| inventory-demand-planning | Stock and demand planning | catalog-specialist |
| pricing | Pricing strategies and tiers | catalog-specialist |
| returns-reverse-logistics | Returns and reverse logistics | backend-engineer |

## Related Rules

- `ecommerce/02-checkout`, `ecommerce/03-payments`
- `security/02-pci`
- `ecommerce/05-inventory`

## Native Orchestration Skills

Use with Tier 2:

- `/implement-checkout-flow` — full checkout workflow
- `/implement-catalog-feature` — catalog + inventory

## Invocation Examples

```
/stripe-integration implement PaymentIntent webhook handler in apps/api/app/features/payments/
/pci-compliance review checkout flow for PCI scope reduction
/pricing design tiered pricing for B2C catalog
```
