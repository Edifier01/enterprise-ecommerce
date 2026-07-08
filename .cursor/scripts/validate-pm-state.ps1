# Validates project-management state files for required sections and freshness.
param(
    [int]$MaxStaleDays = 7
)

$ErrorActionPreference = "Continue"
$pmDir = Join-Path $PSScriptRoot "..\project-management"
$exitCode = 0
$warnings = @()

function Test-Section {
    param([string]$File, [string[]]$RequiredSections)
    if (-not (Test-Path $File)) {
        Write-Host "FAIL: Missing $File" -ForegroundColor Red
        script:exitCode = 1
        return
    }
    $content = Get-Content $File -Raw
    foreach ($section in $RequiredSections) {
        if ($content -notmatch [regex]::Escape($section)) {
            Write-Host "FAIL: $File missing section '$section'" -ForegroundColor Red
            script:exitCode = 1
        }
    }
}

Write-Host "Validating PM state in $pmDir..." -ForegroundColor Cyan

Test-Section (Join-Path $pmDir "PROJECT_STATUS.md") @("Current Phase", "Last Updated", "Last Agent")
Test-Section (Join-Path $pmDir "TASKS.md") @("Epic:", "Status:")
Test-Section (Join-Path $pmDir "HANDOFF.md") @("Current Agent", "Next Recommended Action", "Files Changed")
Test-Section (Join-Path $pmDir "CURRENT_CONTEXT.md") @("Current Module", "Last Updated")
Test-Section (Join-Path $pmDir "DECISIONS.md") @("Decision ID")

$statusFile = Join-Path $pmDir "PROJECT_STATUS.md"
if (Test-Path $statusFile) {
    $status = Get-Content $statusFile -Raw
    if ($status -match 'Last Updated\s*\n+\s*(\d{4}-\d{2}-\d{2})') {
        $lastUpdated = [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd', $null)
        $age = (Get-Date) - $lastUpdated
        if ($age.TotalDays -gt $MaxStaleDays) {
            $warnings += "PROJECT_STATUS Last Updated is $($Matches[1]) (>$MaxStaleDays days old)"
        }
    }
}

$decisionsFile = Join-Path $pmDir "DECISIONS.md"
if (Test-Path $decisionsFile) {
    $decisions = Get-Content $decisionsFile -Raw
    $adrLinks = [regex]::Matches($decisions, 'docs/adr/([^\s`]+\.md)')
    foreach ($match in $adrLinks) {
        $adrPath = Join-Path (Split-Path (Split-Path $pmDir)) "docs\adr\$($match.Groups[1].Value)"
        if (-not (Test-Path $adrPath)) {
            Write-Host "FAIL: DECISIONS.md links missing ADR: $($match.Groups[1].Value)" -ForegroundColor Red
            $exitCode = 1
        }
    }
}

foreach ($w in $warnings) {
    Write-Host "WARN: $w" -ForegroundColor Yellow
}

if ($exitCode -eq 0) {
    Write-Host "PM state validation passed." -ForegroundColor Green
} else {
    Write-Host "PM state validation failed." -ForegroundColor Red
}

exit $exitCode
