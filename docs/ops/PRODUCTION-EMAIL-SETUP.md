# Production Email Setup (reg.ru)

Transactional auth email for **Сухопут**: registration verification and password reset.

## Mailboxes

| Address | Role |
|---------|------|
| `noreply@сухопут-кмв.рф` | SMTP sender (`EMAIL_FROM`, `SMTP_USER`) |
| `support@сухопут-кмв.рф` | Reply-To in customer emails (`EMAIL_REPLY_TO`) |
| `info@сухопут-кмв.рф` | Marketing/newsletters — Phase 2 (not wired yet) |

## SMTP (reg.ru hosting)

From the reg.ru mailbox panel:

| Setting | Value |
|---------|-------|
| Host | `sm42.hosting.reg.ru` |
| Port | `587` (STARTTLS) or `465` (SSL/TLS) |
| Login | full mailbox address, e.g. `noreply@сухопут-кмв.рф` |
| Password | mailbox password (never commit to git) |

## Production `.env.production`

```env
EMAIL_PROVIDER=smtp
STOREFRONT_URL=https://сухопут-кмв.рф
EMAIL_FROM=noreply@сухопут-кмв.рф
EMAIL_REPLY_TO=support@сухопут-кмв.рф
SMTP_HOST=sm42.hosting.reg.ru
SMTP_PORT=587
SMTP_USER=noreply@сухопут-кмв.рф
SMTP_PASSWORD=<mailbox-password>
SMTP_USE_TLS=true
```

After editing env on the server:

```bash
docker compose -f docker-compose.prod.yml up -d api
```

## DNS (deliverability)

Configure in reg.ru DNS for `сухопут-кмв.рф`:

1. **SPF** — TXT on `@` (use the exact value from reg.ru mail panel if it differs):

   `v=spf1 include:_spf.hosting.reg.ru ~all`

2. **DKIM** — enable in reg.ru mail hosting and publish the TXT record they provide.

3. **DMARC** (recommended after SPF/DKIM):

   `v=DMARC1; p=none; rua=mailto:info@сухопут-кмв.рф`

## Verification checklist

1. Register on `https://сухопут-кмв.рф/register` with a real inbox.
2. Confirm verification email arrives (check spam folder first time).
3. Open link → login works.
4. Use **Forgot password** → reset email arrives → new password works.
5. Optional: score inbox placement at [mail-tester.com](https://www.mail-tester.com).

## Development

Local/dev keeps `EMAIL_PROVIDER=console` — emails are logged to API stdout, not sent.

## Security

- Rotate mailbox password if it was shared outside the server env file.
- Do not log SMTP passwords or raw verification/reset tokens.
- `EMAIL_PROVIDER=console` is rejected when `ENVIRONMENT=production`.
