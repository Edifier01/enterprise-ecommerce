# Cursor AI Platform Setup

## Workspace

Open the repository root in Cursor:

```
C:\Users\HUAWEI\Documents\enterprise-ecommerce
```

Do not open `Documents\.cursor` — that was a legacy wrapper folder.  
Do not confuse with global Cursor settings at `C:\Users\HUAWEI\.cursor\`.

## Structure

```
.cursor/
├── rules/       # Project rules (.mdc)
├── skills/      # Agent skills (SKILL.md)
├── agents/      # Subagent specialists (.md)
├── project-management/  # Agent coordination state (read/update every session)
├── hooks.json   # Session hooks (PM context inject + update reminders)
├── hooks/       # Hook scripts
├── mcp.json     # MCP config (copy from mcp.json.example)
└── mcp.json.example
docs/
├── SKILL-MANIFEST.md
├── MODEL-ROUTING.md
└── SETUP.md
templates/       # Document templates (00–11)
```

Canonical rules path: `.cursor/rules/` (legacy `rules/` at repo root removed).

## Workflows

Domain playbooks in `workflows/`:

- `catalog-feature.md` — catalog implementation
- `checkout-feature.md` — checkout and Stripe
- `session-handoff.md` — PM session protocol

Agent index: `.cursor/agents/README.md`

## Initial Setup

1. Copy `.cursor/mcp.json.example` → `.cursor/mcp.json` (already present in repo)
2. Run MCP env setup (Windows):

   ```powershell
   .\.cursor\scripts\setup-mcp-env.ps1
   ```

3. Set remaining environment variables (User env, not `.env`):

   | Variable | Required | Used by |
   |----------|----------|---------|
   | `CONTEXT7_API_KEY` | Yes | context7 |
   | `GITHUB_PAT` | Yes | github |
   | `DATABASE_URL` | Yes | postgres MCP — `postgresql://postgres:postgres@localhost:5433/ecommerce` (port **5433** — see `docker-compose.yml`). API/Alembic accept this or `postgresql+asyncpg://…` (auto-normalized to asyncpg). |
   | `SENTRY_AUTH_TOKEN` | No | sentry (optional — not in default `mcp.json`) |

4. Start PostgreSQL: `docker compose up -d postgres`
5. Ensure Docker Desktop is running (for `docker` MCP)
6. **Fully restart Cursor** after env or `mcp.json` changes
7. Verify **Settings → MCP** (green status)

### MCP servers (9 active)

| Server | Package | Notes |
|--------|---------|-------|
| context7 | HTTP | Needs `CONTEXT7_API_KEY` |
| github | `@modelcontextprotocol/server-github` | Needs `GITHUB_PAT` |
| postgres | `@modelcontextprotocol/server-postgres` | Deprecated but works; URL passed as CLI arg |
| playwright | `@playwright/mcp` | E2E browser |
| shadcn | `shadcn@latest mcp` | First start may show "Loading tools" |
| docker | `@hypnosis/docker-mcp-server` | Needs Docker Desktop running |
| fetch | `mcp-fetch-server` | Replaces removed `@modelcontextprotocol/server-fetch` |
| memory | `@modelcontextprotocol/server-memory` | Project conventions |
| project-files | `@modelcontextprotocol/server-filesystem` | Reads `openapi.yaml`, docs (replaces removed openapi MCP) |

**Removed from default config:** `sentry` (optional — see `mcp.json.example`), `@modelcontextprotocol/server-openapi` (package no longer on npm).

### Troubleshooting red MCP servers

| Server | Common fix |
|--------|------------|
| postgres | Set `DATABASE_URL`, run `docker compose up -d postgres`, restart Cursor |
| docker | Start Docker Desktop; run `docker ps` |
| fetch / shadcn | Wait for first `npx` download; check network |
| project-files | Update path in `.cursor/mcp.json` if repo moved |

### Troubleshooting `alembic upgrade head`

Local Docker maps Postgres to port **5433** (`docker-compose.yml`), not 5432. If you see `ConnectionDoesNotExistError` or connection reset:

1. Confirm Postgres is up: `docker compose ps` (port `5433->5432`)
2. Update your user `DATABASE_URL` (setup script only sets it once):

   ```powershell
   [Environment]::SetEnvironmentVariable(
     "DATABASE_URL",
     "postgresql://postgres:postgres@localhost:5433/ecommerce",
     "User"
   )
   ```

3. Restart the terminal (or Cursor) and rerun from `apps/api`:

   ```powershell
   alembic upgrade head
   ```

## Connect to Store Repo

The monorepo scaffold lives in this repository:

- `apps/web/` — Next.js storefront
- `apps/api/` — FastAPI backend
- `openapi.yaml` — API contract for OpenAPI MCP
- `docker compose up -d postgres` — local database

Copy `.env.example` to `.env` before running services.

## Daily Workflow

0. Agent auto-loads `CURRENT_CONTEXT.md` via `sessionStart` hook (see `.cursor/hooks.json`)
1. `/context-loading` — load project state, rules, and MCP
2. Read `.cursor/project-management/HANDOFF.md` for previous session
3. `/model-routing` — pick model
4. Domain skill (e.g. `/implement-checkout-flow`)
5. Agent: `/checkout-specialist` for complex domains
6. `/verifier` before marking done
7. Update `.cursor/project-management/` before ending session

## Stack

- Frontend: Next.js App Router, shadcn/ui, Zustand, Zod
- Backend: FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2
- Database: PostgreSQL
