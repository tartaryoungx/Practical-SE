## DONE

- Built the local frontend prototype in `frontend/`: Next.js App Router, TypeScript, Tailwind, shadcn/Radix controls, domain UI, and a centralized asynchronous mock API with temporary tab storage.
- Verified the prototype before the authorization-policy change: typecheck, lint and production build passed; 7 mock-service tests and 5 Chrome browser tests passed. Those browser results do not cover the current API-backed UI.
- Updated `prompt.md` to resolve U-ACCESS and remove store associations while retaining all 16 Story IDs.
- Story 000 foundation: Postgres 16 Compose, FastAPI, synchronous SQLAlchemy, Alembic, shared errors, and credentialed CORS for `http://localhost:3000`.
- Implemented and verified on 2026-10-22, against temporary test databases and the existing application database: login and logout, profile, user list/create/edit/status/admin reset, role assignment, permission grants, garment recording, condition, evidence, recommendation, and confirm/override. Backend suite after the 005-4 rejection cases: `24 passed`. Frontend: typecheck passed, lint passed with no warnings, production build passed, and the 7 mock-service tests passed. A live login as the bootstrap administrator against the existing database returned 200.
- The signed-in UI now calls the HTTP API. Store requirements were removed from account creation, garment access, and the permission editor. Administration remains ADMIN-only. Return grants work for any role that has them.

## CURRENT

- Sprint 1 stories 001 through 005-4 remain implemented. The 2026-10-22 backend result of 24 passed tests is historical. The current suite, including Sprint 2, is 32 passed.
- Sprint 2 stories 006-1, 006-2, 006-3, 006-4, 007, 008-1, 008-2, 009-1, 009-2, 010-1, 010-2, 011-1, 011-2, 012-1, 012-2, and 013-1 are implemented. Scope and provisional data decisions are in `docs/sprint-2.md`. Report generation, publishing, exports, and report history were not added.
- Verified again on 2026-11-12 for release. Backend: `32 passed in 35.69s`. Frontend: typecheck passed, lint passed, `npm test` passed 7 mock-service tests, `npm run build` passed with 18 routes, and `npm run test:browser` passed 2 Playwright tests in 16.0s. The browser tests used a new `gr_browser_*` database and Playwright Chromium. The application database was not reset.
- Playwright uploaded `release-outcome.png` through the outcome form, rejected a text file, retrieved the PNG bytes from the outcome evidence URL, and showed no evidence on the garment. After submission the file control was gone and the filename remained.
- A `VALID` batch with a newly opened correction request stayed fully verified, and the draft report count stayed 1. That matches the written stories. It is recorded as an open question in `docs/sprint-2.md`, not changed.

## ISSUES

- The example `JWT_SECRET` value `replace_me` is shorter than PyJWT's recommended 32 bytes. Login still succeeded; PyJWT printed an insecure-key warning for that value.
- A `VALID` decision and an `OPEN` or `REOPENED` data issue can exist together. The draft report still counts that batch. The written Sprint 2 rules do not say to exclude it.
- The 7 frontend unit tests exercise the unused in-memory mock. The API-backed browser coverage is `frontend/tests/browser/workflows.spec.ts`.
- `project.html` and the prototype review screenshots are not in the repository.

## NEXT

1. Replace `JWT_SECRET` with a random value of at least 32 bytes in the local env file.
2. Decide whether an unresolved data issue should remove a batch from the draft report count. The current code follows the written rule and does not.
3. Do not start report generation, publishing, exports, or report history. Those are outside story 013-1.
