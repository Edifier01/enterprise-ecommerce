# Post-edit quality reminder for sensitive / typed paths.
# Fail-open: never blocks edits. Emits additional_context when useful.
$ErrorActionPreference = "Stop"

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) {
        Write-Output "{}"
        exit 0
    }

    $payload = $raw | ConvertFrom-Json
    $candidates = @()

    if ($null -ne $payload.file_path) { $candidates += [string]$payload.file_path }
    if ($null -ne $payload.filePath) { $candidates += [string]$payload.filePath }
    if ($null -ne $payload.path) { $candidates += [string]$payload.path }
    if ($null -ne $payload.file) { $candidates += [string]$payload.file }
    if ($null -ne $payload.tool_input) {
        $ti = $payload.tool_input
        if ($null -ne $ti.file_path) { $candidates += [string]$ti.file_path }
        if ($null -ne $ti.path) { $candidates += [string]$ti.path }
        if ($null -ne $ti.target_file) { $candidates += [string]$ti.target_file }
    }
    if ($null -ne $payload.toolInput) {
        $ti = $payload.toolInput
        if ($null -ne $ti.file_path) { $candidates += [string]$ti.file_path }
        if ($null -ne $ti.path) { $candidates += [string]$ti.path }
    }

    $path = ($candidates | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1)
    if (-not $path) {
        Write-Output "{}"
        exit 0
    }

    $normalized = $path -replace '\\', '/'
    $isTs = $normalized -match '\.(ts|tsx)$'
    $isPy = $normalized -match '\.py$'
    if (-not ($isTs -or $isPy)) {
        Write-Output "{}"
        exit 0
    }

    $sensitive = $normalized -match '(?i)(checkout|payment|webhook|yookassa|stripe|auth|moysklad|inventory|order)'
    $hints = New-Object System.Collections.Generic.List[string]

    if ($isTs) {
        $hints.Add("Edited TypeScript ($normalized). Before finishing the feature, run tsc --noEmit in apps/web.")
    }
    if ($isPy) {
        $hints.Add("Edited Python ($normalized). Before finishing the feature, run ruff check on touched files and relevant pytest.")
    }
    if ($sensitive) {
        $hints.Add("Sensitive path detected. Before claiming done: invoke silent-failure-hunter; for payments/auth also diff-reviewer then verifier. Webhooks/notifications must verify signatures and stay idempotent (ADR-004 for YooKassa).")
    }

    if ($hints.Count -eq 0) {
        Write-Output "{}"
        exit 0
    }

    $text = ($hints -join " ")
    $out = @{
        additional_context = "## Hook: edit quality reminder`n`n$text"
    }
    $out | ConvertTo-Json -Compress
    exit 0
}
catch {
    Write-Output "{}"
    exit 0
}
