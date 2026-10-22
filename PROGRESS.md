## DONE

- Built the local frontend prototype in `frontend/`: Next.js App Router, TypeScript, Tailwind, shadcn/Radix controls, domain UI, and a centralized asynchronous mock API with temporary tab storage.
- Verified the prototype before the authorization-policy change: typecheck, lint and production build passed; 7 mock-service tests and 5 Chrome browser tests passed. Those browser results do not cover the current API-backed UI.
- Updated `prompt.md` to resolve U-ACCESS and remove store associations while retaining all 16 Story IDs.
- Story 000 foundation: Postgres 16 Compose, FastAPI, synchronous SQLAlchemy, Alembic, shared errors, and credentialed CORS for `http://localhost:3000`.
- Implemented and verified on 2026-10-22, against temporary test databases and the existing application database: login and logout, profile, user list/create/edit/status/admin reset, role assignment, permission grants, garment recording, condition, evidence, recommendation, and confirm/override. Backend suite after the 005-4 rejection cases: `24 passed`. Frontend: typecheck passed, lint passed with no warnings, production build passed, and the 7 mock-service tests passed. A live login as the bootstrap administrator against the existing database returned 200.
- The signed-in UI now calls the HTTP API. Store requirements were removed from account creation, garment access, and the permission editor. Administration remains ADMIN-only. Return grants work for any role that has them.

## CURRENT

- Sprint 1 stories 001, 002-1, 002-2, 003-1, 003-2, 003-3, 003-4, 003-5, 004-1, 004-2, 004-3, 005-1, 005-2, 005-3, and 005-4 are implemented. Story 005-4's remaining rejection cases passed in `test_confirmation_rejects_invalid_unauthorized_and_post_confirm_changes`, together with the earlier confirmation checks, in the backend suite of 24 passed tests.
- The workspace still contains Thai labels on the garment and user screens. Shell, sign-in, profile, password, and the permission explanation were switched to English.
- Story 006 and later stories are not started.

## ISSUES

- Browser workflow tests still look for the old prototype buttons and were not run. A manual browser pass of the connected UI was not done.
- The example `JWT_SECRET` value `replace_me` is shorter than PyJWT's recommended 32 bytes. Login still succeeded; PyJWT printed an insecure-key warning for that value.
- The leftover in-memory mock is no longer used by the application. Its messages are still Thai.
- `project.html` and the prototype review screenshots are not in the repository.

## NEXT

1. Walk through the signed-in UI in a browser: admin creates staff, staff records and confirms a garment, and a user without Return access is denied.
2. Replace the remaining Thai screen copy with English without changing the layout.
3. Replace `JWT_SECRET` with a random value of at least 32 bytes in the local env file.
4. Do not start Story 006 until the browser pass is done.
