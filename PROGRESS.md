## DONE

- Built the local frontend prototype in `frontend/`: Next.js App Router, TypeScript, Tailwind, shadcn/Radix controls, domain UI, and a centralized asynchronous mock API with temporary tab storage.
- Implemented mock login/logout, profile/password/recovery, user administration, role/permission editing and review, and garment recording/assessment/evidence/recommendation/confirmation/read-only retrieval.
- Verified the prototype before the latest authorization-policy change: typecheck, lint and production build passed; 7 mock-service tests and 5 Chrome browser tests passed, including mobile layout and dialog keyboard focus. Evidence: `frontend/tests/`, `frontend/docs/prototype-review.md`, and review screenshots. These results do not establish full-system AC completion or compliance with the revised authorization policy.
- Updated `prompt.md` to resolve U-ACCESS and remove store associations/restrictions while retaining all 16 Story IDs and 71 AC IDs. Added the single-file progress logging rules and initialized this log from repository evidence.
- Implemented the Story 000 backend foundation without changing the frontend prototype: Postgres 16 Compose, FastAPI, synchronous SQLAlchemy, Alembic, shared errors, credentialed CORS for `http://localhost:3000`, and idempotent seeding of `ADMIN`, `STORE_STAFF`, `CONTRACTOR`, and `HEAD`.
- Verified on 2026-10-22 against a new database volume: Postgres became healthy, `alembic upgrade head` created only `roles`, two seed runs left those four roles, and `backend/tests/test_foundation.py` reported 10 passed. `GET /health` returned 200 and an unknown path returned the shared error envelope. AC-000-02 and AC-000-03 are recorded as passed in `docs/acceptance.md`. This does not complete Story 000: AC-000-01, AC-000-04, and AC-000-05 remain open.

## CURRENT

- Story 000 foundation code is in place and the backend checks above passed. The frontend prototype is unchanged and still uses the mock API.
- AC-000-01 is not fully closed because the Next.js dev server was not started. AC-000-04 and the permission half of AC-000-05 are intentionally still open.

## ISSUES

- **Resolved decision, implementation gap:** U-ACCESS is resolved, not a business blocker. Mock service and UI still restrict Return access to STORE_STAFF, require/filter by store, and reject cross-role grants. Types, fixtures, tests, README/review notes and `project.html` also retain earlier store/unresolved-policy content. `project.html` and the review screenshots cited by the prototype docs are not in the repository.
- Existing prototype verification covers the old policy. Revised permission-based behavior requires updated tests and verification before being marked complete.
- Local Node is not on the normal PATH; prior checks used `/tmp/node-v22.23.3-darwin-arm64/bin`. README documents this temporary runtime and normal Node 22 setup.
- Last dependency audit: zero runtime advisories; five high-severity entries remain in the development-only ESLint glob/braces chain. An incompatible automatic major-version downgrade was not applied.
- Story 000 does not seed permission definitions, so repeated-seed protection for grants cannot be verified yet. The prototype does not use the backend error envelope.

## NEXT

1. Review the Story 000 foundation. Do not start Story 001 until that review is accepted.
2. Keep the frontend prototype unchanged until a separate slice aligns it with U-ACCESS and English UI text.
3. Close AC-000-01 by running the documented Next.js command when Node is available. Leave AC-000-04 and the permission half of AC-000-05 open until those slices exist.
