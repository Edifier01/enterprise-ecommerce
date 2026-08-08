#!/usr/bin/env bash
# Unix twin of post-edit-quality.ps1 — fail-open quality reminder.
set -euo pipefail

raw="$(cat || true)"
if [[ -z "${raw// }" ]]; then
  echo '{}'
  exit 0
fi

python - "$raw" <<'PY' || echo '{}'
import json, re, sys

raw = sys.argv[1] if len(sys.argv) > 1 else ""
try:
    payload = json.loads(raw)
except Exception:
    print("{}")
    raise SystemExit(0)

candidates = []
for key in ("file_path", "filePath", "path", "file"):
    val = payload.get(key)
    if val:
        candidates.append(str(val))
for nest in ("tool_input", "toolInput"):
    ti = payload.get(nest) or {}
    if isinstance(ti, dict):
        for key in ("file_path", "path", "target_file"):
            val = ti.get(key)
            if val:
                candidates.append(str(val))

path = next((c for c in candidates if c.strip()), "")
if not path:
    print("{}")
    raise SystemExit(0)

normalized = path.replace("\\", "/")
is_ts = bool(re.search(r"\.(ts|tsx)$", normalized))
is_py = bool(re.search(r"\.py$", normalized))
if not (is_ts or is_py):
    print("{}")
    raise SystemExit(0)

sensitive = bool(
    re.search(
        r"(checkout|payment|webhook|yookassa|stripe|auth|moysklad|inventory|order)",
        normalized,
        re.I,
    )
)
hints = []
if is_ts:
    hints.append(
        f"Edited TypeScript (`{normalized}`). Before finishing the feature, run `tsc --noEmit` in `apps/web`."
    )
if is_py:
    hints.append(
        f"Edited Python (`{normalized}`). Before finishing the feature, run `ruff check` on touched files and relevant `pytest`."
    )
if sensitive:
    hints.append(
        "Sensitive path detected. Before claiming done: invoke `silent-failure-hunter`; "
        "for payments/auth also `diff-reviewer` then `verifier`. "
        "Webhooks/notifications must verify signatures and stay idempotent (ADR-004 for YooKassa)."
    )

if not hints:
    print("{}")
    raise SystemExit(0)

text = " ".join(hints)
print(json.dumps({"additional_context": f"## Hook: edit quality reminder\n\n{text}"}))
PY
