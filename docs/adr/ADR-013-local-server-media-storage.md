# ADR-013: Local Server Media Storage

## Status

Accepted — 2026-07-21

## Context

Admin catalog images were stored via an optional S3 backend with presigned browser
uploads and a CDN URL in production. The deployment target is a single VPS with
Docker Compose and Caddy. Operating S3 + CDN adds cost and ops complexity
without a current scale requirement.

Local filesystem storage already existed for development (`POST /admin/media/upload`,
`StaticFiles` at `/media`, Caddy proxy in production).

## Decision

1. **Remove S3** as a media backend — no boto3, no presign endpoint, no S3 env vars.
2. **Production uses local disk** on the API container with a named Docker volume
   (`media_uploads` → `/app/uploads`).
3. **Public URLs** use `MEDIA_PUBLIC_BASE_URL` (e.g. `https://domain/media/{file}`).
   Caddy routes `/media/*` to the API process.
4. **Production validators** require `media_public_base_url` with `https://`.
5. Admin upload flow is always `POST /api/v1/admin/media/upload` (multipart).

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Keep S3 for production only | User requirement to store on server; unnecessary infra |
| Separate nginx static volume | Caddy already proxies `/media/*`; no extra service needed |
| Store files in PostgreSQL bytea | Poor fit for image serving and backups |

## Consequences

- Positive: simpler deploy, no cloud object storage credentials, works on one VPS.
- Negative: disk and backup are operator responsibilities; horizontal API scaling
  would need shared storage (out of scope for current single-node deploy).

## Related

- Supersedes production S3 requirement from admin production hardening (2026-07-20).
- `docs/PRODUCTION-MEDIA-MFA.md`
- ADR-009 (product `image_url` as URL strings — unchanged)
