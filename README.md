# Garment Returns

Sprint 1 foundation for a local FastAPI backend and PostgreSQL 16. The Next.js prototype in `frontend/` is unchanged and still uses its in-browser mock.

This slice provides the host processes, database connectivity, the Alembic schema, shared API errors, CORS, and the four fixed roles: `ADMIN`, `STORE_STAFF`, `CONTRACTOR`, and `HEAD`. It does not implement authentication, users, permissions, garments, or evidence.

## Prerequisites

- Python 3.12
- Docker with Docker Compose
- Node.js 22 and npm, only if you also want to run the existing frontend prototype

FastAPI and Next.js run on the host. Compose runs PostgreSQL only.

## Setup

From the repository root:

```sh
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

`frontend/.env.local` is unused by the current prototype. The mock client does not call the API.

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

The API is http://localhost:8000. `GET /health` checks the database with `SELECT 1` and returns `{"status": "ok"}`. Interactive API docs are at http://localhost:8000/docs. The prototype remains at http://localhost:3000 and does not use this API yet.

Run `python -m app.seed` again whenever you need to confirm the roles exist. A second run inserts nothing.

## Tests

Story 000 tests need the same Postgres server. They create a temporary database named `gr_test_<random>`, migrate that database, and drop only that database. They do not migrate, truncate, or drop the application database, and they do not remove the Docker volume.

From `backend/` with the virtualenv active:

```sh
TEST_DATABASE_URL=postgresql+psycopg://garment_app:replace_me@localhost:5432/garment_returns pytest
```

Use the same user and password as `DATABASE_URL`. The database name in `TEST_DATABASE_URL` is not modified. The configured user must be allowed to create and drop a temporary database. The Compose user is a superuser, which is sufficient.

## Technical defaults

- Python 3.12, synchronous SQLAlchemy 2.x, and psycopg 3.
- PostgreSQL 16. Data is stored in the named volume `pgdata` at `/var/lib/postgresql/data`.
- Schema changes go through Alembic. The application does not create tables at startup.
- The only table added here is `roles`, with primary key `code` limited to the four roles above. `alembic_version` is Alembic's own bookkeeping table.
- API errors use one JSON shape: `{ "error": { "code": "...", "message": "...", "details": [] } }`. Validation uses HTTP 422. Missing resources use 404. A database failure uses 503 and does not include the driver error. Unexpected failures use 500 and do not include a traceback.
- CORS allows `http://localhost:3000` with credentials. Wildcard origins are rejected.
- `JWT_SECRET`, cookie settings, and `UPLOAD_DIR` are loaded so later stories can use the same settings file. This slice does not issue tokens, set cookies, hash passwords, or store uploads.

## Data preservation

`docker compose down` stops Postgres and keeps the named volume. Starting Compose again reuses that data. Deleting the volume is destructive and is not part of normal setup. Changing `POSTGRES_PASSWORD` in `.env` does not change the password of a database that already exists.

Do not point tests at a database you need to keep unless that user can create a separate temporary database. The tests drop only the temporary database they create.
