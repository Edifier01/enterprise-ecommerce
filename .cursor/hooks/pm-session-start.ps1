# Injects CURRENT_CONTEXT.md into agent session at start.
# Uses bash on Unix/Git Bash; falls back to inline PowerShell on Windows.
$ErrorActionPreference = "Stop"
$contextPath = Join-Path $PSScriptRoot "..\project-management\CURRENT_CONTEXT.md"

if (-not (Test-Path $contextPath)) {
    Write-Output "{}"
    exit 0
}

$bash = Get-Command bash -ErrorAction SilentlyContinue
if ($bash) {
    & bash (Join-Path $PSScriptRoot "pm-session-start.sh")
    exit $LASTEXITCODE
}

$content = Get-Content $contextPath -Raw -Encoding UTF8
$payload = @{
    additional_context = @"
## Project Management — Session Context (auto-loaded)

Read full state in `.cursor/project-management/` before coding.

$content
"@
}

$payload | ConvertTo-Json -Compress -Depth 3
exit 0
