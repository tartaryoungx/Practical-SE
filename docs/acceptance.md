# Acceptance checklist

Results below are only checks that were run on 2026-10-22. Unlisted acceptance criteria were not marked.

| Story ID | AC ID | Test Reference | Result | Status |
|---|---|---|---|---|
| 000 | AC-000-02 | `backend/tests/test_foundation.py::test_upgrade_creates_only_the_roles_table` | Passed. An empty temporary database migrated to the Sprint 1 tables only. | passed |
| 000 | AC-000-03 | Root, backend, and frontend `.env.example` files | Placeholders cover the database URL, JWT, cookie, CORS, upload directory, and frontend API base URL. | passed |
| 000 | AC-000-05 | `backend/tests/test_foundation.py::test_seed_is_idempotent` and live `python -m app.seed` twice | Four roles remained. A second seed did not duplicate permission rows or reset the bootstrap administrator. | passed |
| 001 | AC-001-02, AC-001-04 | `backend/tests/test_sprint.py::test_login_success_failure_and_logout` | Passed. Active login sets a cookie. Wrong and unknown accounts return the same 401 message. Logout blocks `/users/me`. | passed |
| 001 | AC-001-04 | `backend/tests/test_sprint.py::test_disabled_account_cannot_authenticate_or_continue` | Passed. A disabled account cannot log in. | passed |
| 002-1 | AC-002-1-01, AC-002-1-06 | `backend/tests/test_sprint.py::test_change_password_and_valid_reset_token` | Passed. Wrong current password does not change the hash. The new password works and the old one fails. | passed |
| 002-1 | AC-002-1-04, AC-002-1-06 | Same test | Passed. A valid reset token changes the password. An invalid token and an expired token return 400 and leave the current password working. | passed |
| 002-2 | AC-002-2-01, AC-002-2-03 | `test_profile_for_each_role`, `test_anonymous_profile_is_blocked` | Passed. Each role receives its own profile. Anonymous `/users/me` returns 401. | passed |
| 003-1 | AC-003-1-01, AC-003-1-03 | `test_admin_lists_and_creates_users` | Passed. Admin receives the account list. A non-admin request returns 403. | passed |
| 003-2 | AC-003-2-01, AC-003-2-04 | `test_admin_lists_and_creates_users` | Passed. Create accepts name, email, role, and password. Duplicate email returns 409. Invalid role returns 422. | passed |
| 003-3 | AC-003-3-01, AC-003-3-04 | `test_edit_is_limited_to_name_and_email` | Passed. Name and email update and are read back. A role field on this endpoint returns 422 and the role stays unchanged. | passed |
| 003-4 | AC-003-4-02, AC-003-4-04 | `test_self_disable_and_last_admin_are_rejected`, `test_disabled_session_is_rejected` | Passed. Self-disable is rejected. A disabled account's existing cookie cannot call `/users/me`. | passed |
| 003-5 | AC-003-5-01, AC-003-5-03 | `test_admin_reset_replaces_the_password` | Passed. A generated temporary password works and the old password fails. A typed password is not returned in the response. A non-admin cannot list users after that login. | passed |
| 004-1 | AC-004-1-01, AC-004-1-03 | `test_role_change_affects_the_next_request`, `test_self_disable_and_last_admin_are_rejected` | Passed. Demoting the last active administrator is rejected. A role change removes garment access on the next request until the new role is granted it. | passed |
| 004-2 | AC-004-2-04, AC-004-2-06, AC-004-2-07 | `test_permission_matrix_and_effective_access` | Passed. Unknown keys and removing administrator permission access are rejected. A stored `users.read` grant does not let a contractor list users. A `returns.read` grant does. `batch.reserved` does not open garment administration. | passed |
| 004-3 | AC-004-3-01 | `GET /roles/permissions` in `test_permission_matrix_and_effective_access` | Passed for the shared read endpoint. The read-only page uses that endpoint. A separate browser check of the page was not run. | passed |
| 005-1 | AC-005-1-02, AC-005-1-04, AC-005-1-05 | `test_garment_routing_evidence_and_confirmation` | Passed. Invalid weight and a creator field are rejected. A valid garment is listed for another staff user. The response has no store field. | passed |
| 005-2 | AC-005-2-02, AC-005-2-04, AC-005-2-06 | Same garment test | Passed. A text upload is rejected. A PNG is stored and retrieved. Confirmation before required evidence is rejected. | passed |
| 005-3 | AC-005-3-01, AC-005-3-04 | Same garment test | Passed. GOOD, WORN, DAMAGED, and STAINED produce the provisional recommendations. An unassessed garment has no recommendation. | passed |
| 005-4 | AC-005-4-03, AC-005-4-04, AC-005-4-06 | `test_garment_routing_evidence_and_confirmation` and `test_confirmation_rejects_invalid_unauthorized_and_post_confirm_changes` | 2026-10-22: both passed in the full backend suite (24 passed). A matching recommendation confirms without a note. A blank override note is rejected and a trimmed note is saved. Repeated confirmation and later assessment are rejected. DAMAGED and STAINED cannot be confirmed without evidence. An invalid route returns 422 and leaves the garment unconfirmed. A user without Return confirm permission receives 403. Evidence upload after confirmation returns 409 and adds no file. | passed |

## Not run on 2026-10-22

These items were outstanding after the Sprint 1 session. The 2026-11-12 release section below replaces the browser and server gaps.

- Browser walkthrough of the signed-in screens.
- `frontend/tests/browser/workflows.spec.ts` as it existed then. It targeted the old prototype labels.
- The Next.js development server.
- An alternate PostgreSQL host port.

## Sprint 2 — verified 2026-11-12

The checks below were run against disposable PostgreSQL databases, except the browser walkthrough, which used the existing application database and only added rows. The application database was already at Alembic revision `0005` and was not reset, truncated, or dropped.

| Story ID | What was verified | Result | Status |
|---|---|---|---|
| 006-1 | `test_fifo_batch_excludes_ineligible_garments_and_recalculates` and `test_concurrent_batches_do_not_share_garments`. Browser: Central store batch PB-0001 selected GR-0006 then GR-0007, skipped unassigned GR-0002, and stored quantity 2 and weight 1 kg. | Passed. FIFO is `created_at` then id. Ineligible and already allocated garments are excluded. Concurrent creation does not share a garment. | passed |
| 006-2 | Same FIFO test, plus the browser removal of GR-0007 after a confirmation dialog. | Passed. Quantity became 1 and weight 0.4 kg. | passed |
| 006-3 | `test_confirm_pickup_and_assigned_receipt`. Browser confirmation removed the exclusion action. | Passed. An empty batch cannot be confirmed. A confirmed batch cannot be edited. | passed |
| 006-4 | Same pickup test. Browser recorded pickup on PB-0001. | Passed. Pickup is accepted only from `READY_FOR_PICKUP` and stores the pickup time. PB-0001 showed 12 Nov 2026, 20:16. | passed |
| 007 | Same receipt test and `test_operational_permissions_are_enforced`. Browser: Omar's list was empty and PB-0001 returned not found; Nora confirmed receipt. | Passed. Receipt sets `RECEIVED` and a received time. Another contractor cannot open or receive the batch. A staff user with `batch.receive` still cannot receive it. | passed |
| 008-1 | `test_sorting_and_final_outcomes_lock_after_submit`. Browser rejected 0.5 kg and saved 0.1 kg in each of the four categories. | Passed. Negatives and totals above the batch weight are rejected. Resale, fibre-to-fibre, downcycling, and unknown stay separate. The server calculates the total. | passed |
| 008-2 | Same sorting test. Browser review showed 0.4 kg against the 0.4 kg batch, then the form became read-only. | Passed. Submission requires an exact total. Later edits are rejected. | passed |
| 009-1 | Same outcome test. Playwright uploaded `release-outcome.png` through the outcome form on an isolated database, retrieved the PNG, and the garment page still said "No evidence yet". | Passed. Outcome evidence is stored on the outcome record. A text upload is rejected. The file remains available after submission, and the form no longer accepts another file. | passed |
| 009-2 | Same outcome test. Browser rejected 0.2 + 0.3 kg, then submitted 0.2 + 0.2 kg. | Passed. Invalid totals are rejected. A submitted record is read-only, including a later evidence upload in the test. | passed |
| 010-1 | `test_monitoring_validation_and_issue_lifecycle`. Browser KPIs showed 2 batches, 1 delayed pickup, 0 flagged, and 0 missing after PB-0002 was confirmed with a planned pickup of 1 May 2026. | Passed. Operational status stays separate from delayed, missing, and validation indicators. Charts use the monitoring payload. | passed |
| 010-2 | Same monitoring test. Browser URL `status=RECEIVED&store=central&contractor=<Nora>&from=2026-06-01&to=2026-06-30` returned PB-0001. `status=DRAFT&store=east` returned no rows. | Passed. Combined filters match the database, and the active values stay in the URL. | passed |
| 011-1 | Same validation test. Browser showed four passed checks and "This batch is not fully verified" before a decision. | Passed. Incomplete data is not reported as fully verified. | passed |
| 011-2 | Same validation test. Browser flagged PB-0001 with a reason, then confirmed valid. The Flag action stayed disabled until the reason had text. | Passed. A blank flag reason returns 422. Monitoring showed Flagged and then Validated without changing the Received status. | passed |
| 012-1 | Same issue test. Browser: Head created DI-0001 for Lane Staff. Lane saw it on Assigned issues. Lane's request to the Head issue list and to monitoring was denied. | Passed. Staff and contractors receive only issues assigned to them. | passed |
| 012-2 | Same issue test. Browser observed Open, Responded, Resolved, and Reopened on DI-0001. The saved status is `REOPENED`. | Passed. Resolve requires a response. Reopen stores the note. | passed |
| 013-1 | `test_report_counts_only_validated_matching_batches`. Browser: 1–30 Jun 2026, Central store, Nora counted 1 and saved RC-0001. The same period with Omar counted 0. 1–31 May 2026, Central store, all contractors counted 0 because PB-0002 is unvalidated. | Passed. Only validated batches inside the period are counted. The saved row shows the store and contractor names. No report file is generated. | passed |

`test_seed_adds_new_permissions_without_restoring_revoked_grants` also passed. A removed operational grant stays removed when seed runs again.

## Release verification — 2026-11-12

| Check | Command | Result |
|---|---|---|
| Backend suite | `cd backend && .venv/bin/pytest -q tests/test_foundation.py tests/test_sprint.py tests/test_sprint2.py` | `32 passed in 35.69s` |
| Frontend typecheck | `cd frontend && npm run typecheck` | Passed |
| Frontend lint | `cd frontend && npm run lint` | Passed, no warnings |
| Frontend unit tests | `cd frontend && npm test` | 7 passed. These cover the unused mock service. |
| Production build | `cd frontend && npm run build` | Passed, 18 routes |
| Browser | `cd frontend && npm run test:browser` | 2 passed in 16.0s using Playwright Chromium |

The browser command creates a database whose name starts with `gr_browser_`, migrates and seeds only that database, and drops it after the run. `garment_returns` was still present afterward, and no `gr_browser_` database remained. Playwright requires `npx playwright install chromium` once.

The Sprint 2 browser test recorded a garment, created and confirmed a batch, recorded pickup, blocked the other contractor, confirmed receipt, submitted sorting, rejected a text file, uploaded and retrieved a PNG on the outcome, submitted outcomes, confirmed the garment had no evidence, validated the batch, counted 1 matching batch, opened a correction request, and counted 1 again.

One interface bug was fixed: the garment store control was marked required, so the empty option could not be saved. `storeCode` is optional. The Sprint 1 browser test now saves a garment with no store selected.

User-facing source text is English. The visible punctuation includes the ellipsis, middle dot, and check mark already used by the screens. `.env`, `backend/.env`, and `frontend/.env.local` are ignored. The tracked environment files are the three `.env.example` files.

## Not run in this session

- A click on empty-batch confirmation or pickup from a status other than ready for pickup. The API tests cover both rejections.
- An alternate PostgreSQL host port.

## Current state

The existing PostgreSQL volume contains Alembic revisions through `0005`. It was not deleted. Sprint 1 garment and account behavior remains. The earlier browser walkthrough added garments GR-0006 and GR-0007, batches PB-0001 and PB-0002, issue DI-0001, report configuration RC-0001, and four review accounts. Legacy garments GR-0001 through GR-0005 still have no store. This release check did not add rows to that database.
