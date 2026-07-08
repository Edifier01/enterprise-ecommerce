# Cursor AI Platform Configuration

This directory is the canonical Cursor configuration for the Enterprise E-Commerce AI Development Platform.

## Structure

| Path | Purpose |
|------|---------|
| `rules/` | Project rules (`.mdc`) — architecture, backend, frontend, ecommerce |
| `skills/` | Agent skills (`SKILL.md`) — workflows and domain knowledge |
| `agents/` | Subagent specialists (`.md`) — AI engineering team |
| `project-management/` | Persistent agent coordination — status, tasks, decisions, handoffs |
| `templates/` | AI platform templates including project-management |
| `hooks.json` | Session hooks — PM context inject, stop/subagent reminders |
| `hooks/` | Hook scripts (pm-session-start.ps1) |
| `scripts/` | PM validation and utility scripts |
| `mcp.json.example` | MCP server template (copy to `mcp.json` with env vars) |

## Quick Start

1. Run `scripts/setup-mcp-env.ps1` and set `CONTEXT7_API_KEY` / `GITHUB_PAT` (see `../docs/SETUP.md`)
2. Copy `mcp.json.example` → `mcp.json` if missing (repo includes working `mcp.json`)
3. Read `../docs/SETUP.md` for full MCP setup
4. Read `project-management/CURRENT_CONTEXT.md` for 30-second orientation
5. Use `/context-loading` and `/model-routing` before tasks

## Rules

- **Always on:** `rules/core/00-core.mdc`, `01-project.mdc`, `02-ai-behavior.mdc`, `10-project-state-management.mdc`
- **On code edit:** `rules/core/09-implementation-efficiency.mdc` (globs: `**/*.{py,ts,tsx}`)

Legacy `rules/` at repo root has been removed. Use only this directory.
