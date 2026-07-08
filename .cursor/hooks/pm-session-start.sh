#!/usr/bin/env bash
# Injects CURRENT_CONTEXT.md into agent session at start (Unix/Git Bash).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTEXT_FILE="${SCRIPT_DIR}/../project-management/CURRENT_CONTEXT.md"

if [[ ! -f "$CONTEXT_FILE" ]]; then
  echo '{}'
  exit 0
fi

CONTENT=$(cat "$CONTEXT_FILE")
python3 - <<'PY' "$CONTENT"
import json, sys
content = sys.argv[1]
payload = {
    "additional_context": (
        "## Project Management — Session Context (auto-loaded)\n\n"
        "Read full state in `.cursor/project-management/` before coding.\n\n"
        + content
    )
}
print(json.dumps(payload, ensure_ascii=False))
PY

exit 0
