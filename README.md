# Enterprise E-Commerce Platform

Monorepo: Next.js storefront + FastAPI backend + PostgreSQL.

**Workspace path:** `C:\Users\HUAWEI\Documents\enterprise-ecommerce`  
Open this folder in Cursor (not the parent `Documents\.cursor` wrapper).

## Structure

```
apps/web/     Next.js 14+ App Router, shadcn/ui
apps/api/     FastAPI, SQLAlchemy, Alembic
.cursor/      AI development platform (rules, skills, agents)
docs/         Documentation and ADRs
openapi.yaml  API contract
```

## Quick Start

```bash
# Database
docker compose up -d postgres

# Backend
cd apps/api
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd apps/web
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill values.

## AI Development

See [docs/SETUP.md](docs/SETUP.md) for Cursor configuration.

- Read `.cursor/project-management/CURRENT_CONTEXT.md` at session start
- `/context-loading` before tasks (loads PM state + rules + MCP)
- `/model-routing` for model selection
- Agents in `.cursor/agents/` — all update PM files after work

## Domains (planned)

catalog · checkout · orders · payments · customers · search
