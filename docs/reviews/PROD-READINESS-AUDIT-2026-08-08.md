# Production Readiness & Logic Audit — «СУХОПУТ»

**Дата:** 2026-08-08  
**Метод:** `/start-feature` → 8 parallel specialists → synthesis  
**Режим:** read-only (код не менялся)  
**Prod:** https://сухопут-кмв.рф  

**Базовые документы (delta, не с нуля):**
- `docs/reviews/COMPREHENSIVE-AUDIT-2026-07-23.md`
- `docs/PROJECT_VERDICT.md` (2026-07-27)
- `docs/reviews/PROJECT-ACTION-PLAN-2026-07-29.md`

**Агенты Round 1:**
| Domain | Agent |
|--------|-------|
| Architecture | [Architect](52d46189-dc90-4a5d-bc27-cef2c69fee73) |
| Backend | [Backend](2305cfb7-a50d-477e-8ade-d4d58a2b51dd) |
| Checkout | [Checkout](a1227ba6-3a46-4e4a-9a03-5d279db4631c) |
| Catalog | [Catalog](a0fe9fb5-8b03-47c2-8552-5f151fb69db5) |
| Frontend | [Frontend](e38856a8-5fd7-4f7b-b812-86459a1d771a) |
| Security | [Security](7c1aa9e2-ce83-46d2-8043-8e6f0f626bc3) |
| DevOps | [DevOps](3639a5be-3c4a-4ba5-b4ac-d1f046a728ec) |
| QA | [QA](ce8aab61-6f46-4bf2-a0a7-de8595620bb3) |

---

## 1. Executive Verdict

| Метрика | Оценка | Комментарий |
|---------|--------|-------------|
| **Функциональная готовность кода** | ~92% | Catalog, admin, MS overlay, stub checkout |
| **Business release-ready** | **~45–55%** | Ниже июльской оценки ~60%: найдены новые money-loss / oversell баги |
| **Архитектура** | ~80% | ADR-005 ↔ ADR-010 конфликт по stock truth |
| **Безопасность** | ~70% | Fail-fast bypassable; headers только на checkout |
| **Тестирование** | ~55% release | Stub/Stripe only; нет YooKassa / prod journey smoke |

**Вердикт:** проект **не готов к коммерческому запуску**. Главный разрыв — не «ещё пара фич», а связка:

1. **Нет YooKassa** (ADR-004) + prod config требует Stripe  
2. **Логические баги денег/остатков** (oversell loop, guest email, failed→retry)  
3. **Ops / контент** (Wave 0, ~329 без категорий, SMTP, контакты, SEO)

---

## 2. Critical Logic Errors (новые / подтверждённые)

### L1 — MS stock sync затирает локальные списания (OVERSELL) — NEW P0

**Где:** `catalog_sync_repository.apply_stock` пишет `quantity_on_hand = max(ms_quantity, reserved)`.  
**Конфликт:** ADR-005 вычитает локально; ADR-010 считает MS authoritative. Export создаёт **customerorder** (не уменьшает баланс MS до отгрузки) → следующий sync восстанавливает допродажное количество.  
**Импакт:** повторные продажи сверх реального остатка.  
**Нужно:** ADR-015 (модель reconciliation) **до** или **параллельно** с YooKassa.

### L2 — Guest order: `guest_email=None` → MS export всегда падает — P0

**Где:** `webhook_service.py` hardcode `guest_email=None`; у `CheckoutSession` нет email.  
**Импакт:** каждый guest-заказ без `moysklad_order_id`.

### L3 — payment_failed → release reservation → retry success → деньги без заказа — NEW P0

**Где:** `_handle_payment_failed` отменяет session + `release_checkout_session`; последующий `succeeded` ловит `InventoryReservationMissingError` и помечает payment FAILED.  
**Импакт:** capture без Order (частый сценарий decline→retry).

### L4 — Client idempotency keys = random UUID каждый клик — P0/P1

**Где:** frontend `createIdempotencyKey()` → `crypto.randomUUID()`.  
**Импакт:** backend dedupe мёртв; двойные session/PI/reservations при retry.

### L5 — Webhook: missing payment record → event marked processed — P1

**Импакт:** redelivery навсегда подавлена (особенно опасно для YooKassa redirect).

### L6 — `in_stock` denorm не обновляется после deduct — P1

PLP `?in_stock=true` врёт до следующего MS sync. Cart проверяет boolean, не threshold `<3`.

### L7 — ERP HTTP внутри транзакции order creation (FOR UPDATE hold) — P0 architecture

`_try_export_to_moysklad` до `commit()` под inventory lock. Нужен outbox (ADR-016).

---

## 3. Missing for Production (P0 / P1 / P2)

### P0 — Release blockers

| ID | Finding | Domain | Effort |
|----|---------|--------|--------|
| **P0-YK** | YooKassa 0% в коде; `IStripeGateway` only | checkout | L |
| **P0-STOCK** | L1 oversell loop MS↔local | architect/inventory | M + ADR |
| **P0-GUEST** | L2 guest email | checkout/backend | M |
| **P0-RETRY** | L3 failed→retry money loss | checkout | M |
| **P0-CONTENT** | ~329 uncategorized MS SKUs → empty storefront | catalog ops | S ops |
| **P0-SMTP** | `SmtpEmailService` = `NotImplementedError`; default console | auth | M |
| **P0-CONTACTS** | `apps/web/src/lib/store/site-config.ts` example.com / fake phone | frontend | S |
| **P0-WAVE0** | Deploy/MS stock/media re-upload/TRUSTED_PROXY unverified | devops | S ops |
| **P0-SEC1** | Prod fail-fast accepts empty admin creds / weak JWT | security | S |
| **P0-SEC2** | `PAYMENT_PROVIDER=stripe` boots without keys/webhook secret | security | S |
| **P0-SEC3** | CSP/HSTS/nosniff only on `/checkout*` | security/frontend | S |

### P1 — Pre-scale / fulfillment

| ID | Finding |
|----|---------|
| **P1-SHIP** | Shipping в DB, нет в public OrderDetail + MS export |
| **P1-IDEM** | Stable client idempotency keys |
| **P1-DENORM** | Sync `in_stock` after deduct; cart threshold |
| **P1-SEO** | Нет `sitemap.ts` / `robots.ts` / metadataBase / OG / canonical |
| **P1-EMAIL-LOG** | Console email logs reset tokens in prod |
| **P1-MEDIA-MEM** | Upload reads full body before size check; no Caddy body limit |
| **P1-SMOKE** | deploy.sh health-only; no prod journey smoke |
| **P1-BACKUP** | Нет runbook backup media/DB |
| **P1-JWT** | No revocation; admin token acceptable as customer (`scope` ignored) |
| **P1-PHOTOS** | Real photography backlog + 404 gallery re-upload |

### P2 — Debt

- Stripe naming in domain/schema (`IStripeGateway`, `stripe_*` columns)
- `ProductImageModel` in moysklad module
- `storefront_visibility` SQLAlchemy in domain
- TTL sweep without `SKIP LOCKED`; MS sync without row lock
- Manual products hardcoded `in_stock=True`
- CI pytest on SQLite vs E2E Postgres
- Conditional E2E `test.skip` when seed incomplete
- Info pages (Контакты / Доставка) → `/` placeholders

---

## 4. Delta vs PROJECT-ACTION-PLAN 2026-07-29

| Plan item | Status 2026-08-08 |
|-----------|-------------------|
| 0.1 Deploy pending | ❌ OPEN (code/scripts improved; ops unconfirmed) |
| 0.2 MS STORE_ID + stock | ❌ OPEN |
| 0.3 media_uploads volume | ⚠️ PARTIAL (deploy.sh checks mount) |
| 0.4 Gallery re-upload | ❌ OPEN |
| 0.5 TRUSTED_PROXY + MEDIA URL | ❌ OPEN |
| 0.6–0.8 CI gate / rate limits / media leak | ✅ DONE |
| 1.1 YooKassa | ❌ NOT STARTED (+ new L3/L4 risks) |
| 1.2 SMTP | ❌ stub only |
| 1.3 329 categories | ❌ OPEN |
| 1.4 Guest email | ❌ column exists, not wired |
| 1.5 Shipping API+MS | ❌ OPEN |
| 1.6 Contacts | ❌ OPEN |
| 2.1 in_stock after deduct | ❌ OPEN (+ L1 oversell NEW) |
| SEO sitemap/OG | ❌ OPEN |

**Новое относительно июля (must track):**
- L1 stock truth loop (ADR-005 vs ADR-010)
- L3 payment decline→retry money loss
- L4 random idempotency keys
- L7 export under inventory lock
- Security empty-creds / stripe-without-keys / global headers

---

## 5. Recommended Execution Order

```
Wave A — Stop the bleeding (before taking money)
  A1. ADR-015 stock reconciliation (architect) — decide before YooKassa
  A2. Fix L3 reservation lifecycle on payment_failed / retry
  A3. Guest email capture → session → order
  A4. Stable idempotency keys (frontend + contract)
  A5. Security fail-fast: JWT length, admin non-empty, provider credentials

Wave B — Release gate
  B1. YooKassa (checkout-specialist) + outbox for MS export (ADR-016)
  B2. SMTP real delivery + prod email_provider validator
  B3. Shipping in OrderDetailSchema + MS export
  B4. YooKassa test-mode E2E + notification pytest

Wave C — Ops + merchandising (parallel with B)
  C1. Wave 0 deploy + MS stock verify + media re-upload
  C2. Assign categories to ~329 + photos + publish
  C3. Real contacts in site-config
  C4. sitemap/robots/metadataBase/OG
  C5. Global security headers via Caddy
  C6. Post-deploy journey smoke (not health-only)

Wave D — Hardening
  D1. in_stock sync + cart threshold
  D2. Media hot-path / upload body limit
  D3. Backup runbook
  D4. CI Postgres pytest parity; remove conditional skips
```

**Следующий `/start-feature`:**  
1) `ADR-015 ERP stock reconciliation` **или**  
2) `YooKassa payment integration` (после/с A2–A4)  

Рекомендация архитектора: **сначала stock ADR**, иначе платежи на oversell-модели.

---

## 6. What is solid (do not rebuild)

- DDD modular monolith, ADR discipline, PM state protocol  
- Admin panel (RBAC, lockout, MS import queue, merchandising guards)  
- Inventory reservation model (when not fighting MS sync)  
- Stub checkout proves cart→order UX shell  
- CI → deploy gate (`workflow_run`), deploy.sh preflight  
- MoySklad import/ACL/read-only catalog client pattern  
- PCI SAQ-A shape (no PAN on our servers) — preserve with YooKassa redirect  

---

## 7. Round 3 — Silent Failure Hunt

**Agent:** [silent-failure-hunter](b269749a-c548-4e51-b47b-7447e41361dd)

| Claim | Verdict |
|-------|---------|
| L3 money without order | **CONFIRMED** Critical |
| L5 event processed on missing payment | **CONFIRMED** High (+ silent variants on failed/canceled with no log) |
| L7 MS HTTP under inventory lock | **CONFIRMED** Critical |

**Additional silent failures:**
- Session missing after payment found → event still processed (High)
- Captured PI with amount/line validation failure → reservation **never released** (High)
- Inventory `increment/release/deduct_reserved` **no-op** if no `inventory_items` row (High)
- MS outbound client `None` → export skipped, no log (Medium)
- MS export `except Exception` swallow (Medium)
- Console email logs reset/verify URLs at INFO (High)

**Must-fix before taking money:** L3, L5, L7, inventory no-ops, captured-payment reservation leak.

---

## 8. Round 3b — Diff Review

**Agent:** [diff-reviewer](c3ef3a1f-708d-4a2b-8fe5-7b4d77407119)  
**Confidence:** HIGH  
**Verdict:** APPROVE WITH NOTES

Agreed P0: YK, STOCK/L1, GUEST/L2, RETRY/L3, SEC1, SEC2 (+ L4/L5/CSP confirmed).

Notes applied:
- L3 = captured funds without order (manual refund path), still P0
- L2 = guest checkout only (auth users use User.email)
- Promote inventory no-ops + L5 + amount-mismatch reservation leak into Wave A must-fix
- 45–55% business-ready is synthesis estimate, not measured KPI

---

## 9. Round 4 — Verifier

**Agent:** [verifier](4b23f2bd-9cd6-4b02-98ed-3ece91266768)  
**Result:** ⚠️ **PASSED WITH NOTES**

Notes addressed: PM state updated; `site-config` path corrected to `apps/web/src/lib/store/site-config.ts`.

---

## 10. Next recommended `/start-feature`

1. **ADR-015 ERP stock reconciliation** (before taking money), **or** Wave A fix pack (L3 + guest email + idempotency + security fail-fast)  
2. Then **YooKassa** with checkout-specialist review chain  
3. Parallel: Wave 0 ops + ~329 categories + SMTP + contacts + SEO

---

*Feature COMPLETED 2026-08-08. No application code modified.*
