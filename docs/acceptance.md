# Acceptance checklist

Story 000 foundation is implemented. Authentication, users, permissions, garments, and evidence are not in this slice. A passing role-seed check does not complete AC-000-05: permission definitions are not seeded. The frontend prototype still uses its mock client, so AC-000-04 is not met.

| Story ID | AC ID | Test Reference | Result | Status |
|---|---|---|---|---|
| 000 | AC-000-01 | README startup commands | 2026-10-22: new Postgres 16 container became healthy, `alembic upgrade head` succeeded, and `GET /health` returned 200 from Uvicorn. The Next.js dev server was not started. | not run |
| 000 | AC-000-02 | `backend/tests/test_foundation.py::test_upgrade_creates_only_the_roles_table` | 2026-10-22: passed. Empty temporary database migrated to `roles` and `alembic_version` only. The new application database was also migrated from empty. | passed |
| 000 | AC-000-03 | `.env.example`, `backend/.env.example`, `frontend/.env.example` | Examples contain placeholders for the database URL, JWT, cookie, CORS, upload directory, and frontend API base URL. No working secrets. | passed |
| 000 | AC-000-04 | Frontend `getApi()` mock; `backend/app/core/errors.py` | Backend envelope verified by `test_validation_database_and_unexpected_errors_use_the_shared_envelope` and a live 404. The prototype does not call the backend. | not run |
| 000 | AC-000-05 | `backend/tests/test_foundation.py::test_seed_is_idempotent` | 2026-10-22: role seed passed and a second seed left one row for each of the four roles. Permission definitions are not implemented. | not run |

## Open decisions

None for this slice. U-ACCESS remains resolved in `prompt.md`. The prototype still implements the earlier store-based behavior.

## Current slice

Story 000 backend foundation: Compose Postgres 16, FastAPI, synchronous SQLAlchemy, Alembic, shared errors, CORS, and the four fixed roles.

## Next slice

Do not start Story 001 until this foundation is reviewed. AC-000-04 and the permission half of AC-000-05 remain open.
