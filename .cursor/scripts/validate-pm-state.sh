#!/usr/bin/env bash
# Validates project-management state files (Unix).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM_DIR="${SCRIPT_DIR}/../project-management"
exit_code=0

check_file() {
  local file="$1"
  shift
  if [[ ! -f "$file" ]]; then
    echo "FAIL: Missing $file"
    exit_code=1
    return
  fi
  for section in "$@"; do
    if ! grep -q "$section" "$file"; then
      echo "FAIL: $file missing section '$section'"
      exit_code=1
    fi
  done
}

echo "Validating PM state in $PM_DIR..."
check_file "$PM_DIR/PROJECT_STATUS.md" "Current Phase" "Last Updated" "Last Agent"
check_file "$PM_DIR/TASKS.md" "Epic:" "Status:"
check_file "$PM_DIR/HANDOFF.md" "Current Agent" "Next Recommended Action" "Files Changed"
check_file "$PM_DIR/CURRENT_CONTEXT.md" "Current Module" "Last Updated"
check_file "$PM_DIR/DECISIONS.md" "Decision ID"

if [[ $exit_code -eq 0 ]]; then
  echo "PM state validation passed."
else
  echo "PM state validation failed."
fi
exit $exit_code
