# Garment Returns — frontend prototype

Interactive UI/UX prototype of Sprint 1, based exclusively on `../prompt.md`. This is **not the implemented backend, database, authentication or security boundary**. `../project.html` remains the separate project presentation.

## Run locally

Prerequisites: Node.js 22 LTS (22.23.3 used for verification), npm, a modern browser.

```sh
cd frontend
npm ci
npm run dev
```

On the current workstation, Node was absent from PATH. Verification used an official checksum-verified temporary Node runtime. Until Node 22 is installed normally, this command runs the already-installed prototype:

```sh
cd frontend
PATH=/tmp/node-v22.23.3-darwin-arm64/bin:$PATH npm run dev
```

The temporary runtime may disappear after system cleanup; use a normal Node 22 installation for ongoing work.

Open http://localhost:3000. No `.env`, Docker, FastAPI, PostgreSQL or external services are needed.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Browser verification uses installed Google Chrome:

```sh
npm run test:browser
```

The test runner starts/stops its own development server on 127.0.0.1:3000. Stop any unrelated server on this port first, or adjust `playwright.config.ts`. Do not run a production build and browser checks simultaneously in the same checkout.

## Demo accounts

All initial passwords are `Demo1234!`. Login offers buttons to fill the four primary accounts; they still submit through the mock login service.

| Email | Role | Store |
|---|---|---|
| admin@demo.test | ADMIN | none |
| staff@demo.test | STORE_STAFF | BKK-01 |
| contractor@demo.test | CONTRACTOR | none |
| head@demo.test | HEAD | none |
| peer@demo.test | STORE_STAFF | BKK-01 |
| north@demo.test | STORE_STAFF | CNX-01 |
| disabled@demo.test | HEAD, disabled | none |

Changes survive route navigation, refresh and logout **in the same tab** using sessionStorage. Closing the tab ends the intended temporary session. If a browser restores tabs it may also restore sessionStorage; clear the `garment-prototype-v1` sessionStorage entry in DevTools to reset. Different independently opened tabs are separate simulations. If sessionStorage is unavailable the adapter uses in-memory state.

Only use invented data and demo passwords. Mock passwords and reset tokens are deliberately ordinary JavaScript data; there are no JWTs, secure cookies, real password hashes, real uploads, or server permissions. Evidence is a local data URL stored with the mock record in this tab, and is never uploaded. Browser storage limits may reject larger collections of evidence; a clear error leaves the record unchanged.

## Suggested review flow

1. Login as Admin → Users → create Staff with a store and initial password.
2. Logout and login with that new account → Record garment.
3. Save its condition → inspect the recommendation; condition alone drives routing.
4. Try DAMAGED without evidence: confirmation is unavailable. Upload JPEG/PNG/WebP, then view it.
5. Select the other route: a nonblank trimmed reason is required. Confirm in the review dialog.
6. Logout/login → find the ID in the garment list → inspect the read-only result.
7. As Admin, edit a user, disable/reactivate, assign a role, directly set a temporary password, or issue a reset link.
8. Open that reset link **in the same tab**. It is manually delivered, valid for 15 minutes and single-use in the simulation. Successful change/reset rejects the old demo password.
9. Revoke/restore Staff permissions and check the read-only access page. Then login as Staff to observe the supported behavior.
10. Try Head/Contractor: own profile and password are available, operational pages are denied.

## Structure and replacement boundary

- `src/app/`: App Router pages and layouts; separate login and public recovery route.
- `src/features/auth`, `users`, `access_control`, `returns`: domain UI and interactions.
- `src/components/ui`: reusable shadcn-style Tailwind controls; official shadcn Button source, Radix Dialog with focus trapping/Escape/restore, common fields and feedback.
- `src/lib/api-contract.ts`: typed asynchronous service boundary and standard `ApiError` with field details.
- `src/lib/api.ts`: selects the prototype adapter. Replace it with the real credentialed HTTP client during implementation.
- `src/lib/mock/seed.ts`: centralized demo accounts, grants, garments and stores.
- `src/lib/mock/service.ts`: simulated authorization, validation, policy, mutations and temporary persistence. Policy here represents the simulated server. Move it to the real backend; do not reuse these client checks as security.
- `tests/mock.test.ts`: mock workflow/rejection/read-back tests, not backend integration tests.
- `tests/browser/`: real browser interaction checks of the prototype.

Visual references: [shadcn Blocks](https://ui.shadcn.com/blocks), especially dashboard-01's shell/table, sidebar-07's collapsible navigation and login-03's focused form. No sample charts, signup, team switching, customer/credit or future-module workflows are imported.

## Policy and UI decisions for review

- **Provisional:** P-ROUTE, P-EVIDENCE, P-STORE and P-RECOVERY remain explicitly labeled. Passing prototype checks does not confirm permanent policy.
- **Unresolved:** U-ACCESS remains blocked: the permission editor cannot enable Return grants for ADMIN/HEAD/CONTRACTOR. No cross-role store association is invented.
- **Mandatory:** administration remains ADMIN-only; no implicit Admin Return access; self-disable and last active Admin demotion are rejected. ADMIN access.read/access.write cannot be removed to lock out administration.
- **Reserved:** Batch/Outcome/Validation/Report have permission definitions, but no effective workflow; the matrix distinguishes this from actual access.
- **UI review:** Thai labels with exact role/route codes; muted green light theme; compact sidebar/table; garment detail uses assessment + evidence beside the recommendation/final decision; irreversible confirmation uses a dialog.
- **Technical defaults for review:** 8–128 character demo passwords, 5 MB image limit, 15-minute recovery tokens, 250 ms simulated latency, local sessionStorage; these are prototype technical choices, not new business rules.
- **Direct Admin reset:** the Admin supplies a temporary password (allowed by the spec), rather than generating one. No forced first-login password change.
- **Recovery:** only the intentional result view exposes a link; the reset page removes the token from the address bar after loading. This is only a UI demonstration of confidentiality, not a security guarantee.

Full-system criteria concerning FastAPI, PostgreSQL, migrations, secure cookies/CSRF, durable storage, concurrency across real requests and deployment are intentionally not implemented in this phase. Do not use this prototype as evidence that those ACs have passed. See `docs/prototype-review.md` for screen mapping and observed checks.
