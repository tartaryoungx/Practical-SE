# Garment Returns

Local application for Sprint 1 accounts and garment returns, plus the Sprint 2 pickup, sorting, outcome, monitoring, validation, correction, and draft report-configuration workflows. A Next.js workspace and a FastAPI backend run on the host. Compose runs PostgreSQL 16 only.

The signed-in UI calls the API at `NEXT_PUBLIC_API_BASE_URL`. Account administration is ADMIN-only. Garment access follows granted Return permissions and is not limited by store. Pickup batches do require a store on each included garment. `docs/sprint-2.md` is the source of truth where it overrides a Sprint 1 exclusion.

## Prerequisites

- Python 3.12
- Docker with Docker Compose
- Node.js 22 and npm for the workspace UI

FastAPI and Next.js run on the host. Compose runs PostgreSQL only.

## Setup

From the repository root:

```sh
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

`frontend/.env.local` supplies the public API base URL. The UI sends credentialed requests to that origin.

Match the database name, user, and password in both env files. The sample password is `replace_me`. If you choose a different password and it contains reserved URL characters, URL-encode it in `DATABASE_URL` only. If port 5432 is already in use, set the same new port in `POSTGRES_PORT` and in `DATABASE_URL`. Use host `localhost`, not the Compose service name.

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

## Startup

Run these from the directories shown.

1. Repository root:

```sh
docker compose up -d
docker compose ps
```

Wait until the Postgres service is healthy. `docker compose logs postgres` shows the server log.

2. `backend/`, with the virtualenv active:

```sh
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

With this repository layout, activate the virtualenv first:

```sh
cd backend
source .venv/bin/activate
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

3. Separate terminal, `frontend/`:

```sh
npm run dev
```

The API is http://localhost:8000. `GET /health` checks the database with `SELECT 1` and returns `{"status": "ok"}`. Interactive API docs are at http://localhost:8000/docs. The workspace is at http://localhost:3000.

`python -m app.seed` creates the four roles, permission definitions, and the initial grants when no grants exist yet. It also creates the bootstrap administrator from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` when that email is new, and the reference stores `central`, `north`, and `east`. Running it again does not duplicate rows, reset that password, or restore a grant an administrator has removed. A new permission key is granted to its initial role only when that key itself is new. The example bootstrap password is `replace_me`.

Run `python -m app.seed` again after an upgrade that adds permission keys. A second run inserts nothing new when the catalog, stores, and administrator are already present.

## Tests

Backend tests need the same Postgres server. They create a temporary database named `gr_test_<random>`, migrate that database, and drop only that database. They do not migrate, truncate, or drop the application database, and they do not remove the Docker volume. The Sprint 2 checks are in `backend/tests/test_sprint2.py`. Browser tests are `cd frontend && npm run test:browser`. They need Playwright Chromium (`npx playwright install chromium`) and create a temporary `gr_browser_*` database, which the teardown drops. They do not use the application database.

From `backend/` with the virtualenv active:

```sh
TEST_DATABASE_URL=postgresql+psycopg://garment_app:replace_me@localhost:5432/garment_returns pytest
```

Use the same user and password as `DATABASE_URL`. The database name in `TEST_DATABASE_URL` is not modified. The configured user must be allowed to create and drop a temporary database. The Compose user is a superuser, which is sufficient.

## Technical defaults

- Python 3.12, synchronous SQLAlchemy 2.x, and psycopg 3.
- PostgreSQL 16. Data is stored in the named volume `pgdata` at `/var/lib/postgresql/data`.
- Schema changes go through Alembic. The application does not create tables at startup. Revision `0005` adds stores, batches, sorting, final outcomes, validations, data issues, and draft report configurations. `garments.store_code` stays nullable, and the migration does not assign existing garments to a store.
- The four roles remain `ADMIN`, `STORE_STAFF`, `CONTRACTOR`, and `HEAD`.
- API errors use one JSON shape: `{ "error": { "code": "...", "message": "...", "details": [] } }`. Validation uses HTTP 422. Missing resources use 404. A database failure uses 503 and does not include the driver error. Unexpected failures use 500 and do not include a traceback.
- CORS allows `http://localhost:3000` with credentials. Use that host in the browser. `http://127.0.0.1:3000` is not an allowed origin. Wildcard origins are rejected.
- Sign-in issues an HTTP-only JWT cookie. State-changing requests send `X-CSRF-Token` from the readable CSRF cookie. Uploaded evidence is stored under `UPLOAD_DIR`.

## Data preservation

`docker compose down` stops Postgres and keeps the named volume. Starting Compose again reuses that data. Deleting the volume is destructive and is not part of normal setup. Changing `POSTGRES_PASSWORD` in `.env` does not change the password of a database that already exists.

Do not point tests at a database you need to keep unless that user can create a separate temporary database. The tests drop only the temporary database they create.
