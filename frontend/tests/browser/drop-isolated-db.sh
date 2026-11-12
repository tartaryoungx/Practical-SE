#!/usr/bin/env bash
# Drops only the database named in the Playwright state file.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STATE_FILE="${TMPDIR:-/tmp}/garment-returns-playwright-state.json"
PYTHON="$ROOT/backend/.venv/bin/python"

if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

GR_BROWSER_STATE="$STATE_FILE" "$PYTHON" - <<'PY'
import json
import os
import shutil
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

state_path = Path(os.environ["GR_BROWSER_STATE"])
state = json.loads(state_path.read_text(encoding="utf-8"))
name = state["database"]
if name == "garment_returns" or not name.startswith("gr_browser_"):
    raise SystemExit("refusing to drop this database")
url = make_url(os.environ["DATABASE_URL"])
admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
with admin.connect() as connection:
    connection.execute(
        text(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = :name AND pid <> pg_backend_pid()
            """
        ),
        {"name": name},
    )
    connection.execute(text(f'DROP DATABASE IF EXISTS "{name}"'))
admin.dispose()
upload = state.get("uploadDir") or ""
if upload.startswith("/tmp/") or upload.startswith("/var/folders/") or upload.startswith("/private/tmp/"):
    shutil.rmtree(upload, ignore_errors=True)
state_path.unlink(missing_ok=True)
PY
