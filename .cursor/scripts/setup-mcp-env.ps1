# Sets Windows User environment variables required by .cursor/mcp.json
# Run once, then fully restart Cursor.

$ErrorActionPreference = "Stop"

$vars = @{
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/ecommerce"
}

foreach ($name in $vars.Keys) {
    $current = [Environment]::GetEnvironmentVariable($name, "User")
    if ($current) {
        Write-Host "$name already set (length $($current.Length)) — skipping"
    } else {
        [Environment]::SetEnvironmentVariable($name, $vars[$name], "User")
        Write-Host "$name set for current user"
    }
}

Write-Host ""
Write-Host "Optional — set manually if not already configured:"
Write-Host "  CONTEXT7_API_KEY  (context7 MCP)"
Write-Host "  GITHUB_PAT        (github MCP)"
Write-Host "  SENTRY_AUTH_TOKEN (optional sentry MCP — add to mcp.json.example)"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. docker compose up -d postgres"
Write-Host "  2. Fully restart Cursor"
Write-Host "  3. Settings -> MCP — verify green status"
