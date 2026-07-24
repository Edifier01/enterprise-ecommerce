# Browser Verification

When checking the site with Playwright MCP, `cursor-ide-browser`, or manual agent smoke tests:

| Purpose | URL |
|---------|-----|
| Storefront | `https://сухопут-кмв.рф` |
| Admin panel | `https://сухопут-кмв.рф/admin` |

**Do not use `localhost` for project verification** unless the user explicitly asks to test a local dev server.

## Exceptions

- Automated CI E2E in `apps/web/e2e/` — keep `localhost` via `playwright.config.ts`
- Local backend/API debugging — use `http://localhost:8000` only when testing API directly
