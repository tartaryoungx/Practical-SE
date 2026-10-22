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

## Not run in this session

- Browser walkthrough of the signed-in screens.
- `frontend/tests/browser/workflows.spec.ts`. Those tests still target the old prototype labels.
- The Next.js development server.
- An alternate PostgreSQL host port.

## Current state

The existing PostgreSQL volume was migrated forward with revisions 0002, 0003, and 0004 and seeded. It was not deleted. Story 006 and later stories were not added.
