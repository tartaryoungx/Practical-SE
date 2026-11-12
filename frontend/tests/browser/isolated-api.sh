#!/usr/bin/env bash
# Starts FastAPI against a new database. It never connects the server to the
# application database and never drops an existing database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STATE_FILE="${TMPDIR:-/tmp}/garment-returns-playwright-state.json"
PYTHON="$ROOT/backend/.venv/bin/python"

if [[ ! -x "$PYTHON" ]]; then
  echo "backend/.venv is missing. Create it before running browser tests." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

DB_NAME="gr_browser_$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
UPLOAD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/gr-browser-uploads.XXXXXX")"
export GR_BROWSER_DB="$DB_NAME"
export GR_BROWSER_UPLOAD="$UPLOAD_DIR"
export GR_BROWSER_STATE="$STATE_FILE"

DATABASE_URL="$(
  GR_BROWSER_DB="$DB_NAME" GR_BROWSER_UPLOAD="$UPLOAD_DIR" GR_BROWSER_STATE="$STATE_FILE" \
    "$PYTHON" - <<'PY'
import json
import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

name = os.environ["GR_BROWSER_DB"]
if name == "garment_returns" or not name.startswith("gr_browser_"):
    raise SystemExit("refusing to create this database name")
url = make_url(os.environ["DATABASE_URL"])
if url.database == name:
    raise SystemExit("refusing to reuse the application database name")
admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
with admin.connect() as connection:
    exists = connection.execute(
        text("SELECT 1 FROM pg_database WHERE datname = :name"),
        {"name": name},
    ).scalar()
    if exists:
        raise SystemExit("isolated database name already exists")
    connection.execute(text(f'CREATE DATABASE "{name}"'))
admin.dispose()
Path(os.environ["GR_BROWSER_STATE"]).write_text(
    json.dumps({"database": name, "uploadDir": os.environ["GR_BROWSER_UPLOAD"]}),
    encoding="utf-8",
)
print(url.set(database=name).render_as_string(hide_password=False))
PY
)"

export DATABASE_URL
export UPLOAD_DIR
export CORS_ORIGINS="http://localhost:13100"
export COOKIE_SECURE="false"
export JWT_SECRET="browser-test-jwt-secret-0123456789abcd"
export BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
export BOOTSTRAP_ADMIN_PASSWORD="Adminpass1"
export BOOTSTRAP_ADMIN_NAME="Browser Admin"

cd "$ROOT/backend"
"$PYTHON" -m alembic upgrade head
"$PYTHON" -m app.seed
exec "$PYTHON" -m uvicorn app.main:app --host 127.0.0.1 --port 18110
