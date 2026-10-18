# Implementation Prompt: Garment Returns MVP — Sprint 1

## 01 — Objective & Business Context

Act as a senior full-stack coding agent assisting one developer. Build a maintainable, working Sprint 1 MVP, including frontend, backend, database, and meaningful verification. Inspect the repository and applicable instructions first; preserve unrelated work.

The Textile Take-back and Recycling Management System supports a mid-sized retailer's in-store used-clothing take-back program and SDG 12. Customers return clothing for store credit. Staff record and assess garments, then confirm routing toward potential resale or external sorting. Long-term transparency and sustainability reporting explain the product purpose, not additional Sprint 1 work.

The expected outcome is a usable account-administration and garment-return flow: an administrator creates Staff, Staff records and routes a garment, and its saved result can be found again. Other roles receive the account capabilities specified below. Deliver working behavior, not scaffolding alone.

## 02 — Source of Truth & Scope

## Mandatory Language Policy — English Only

**All project documentation, development logs, code comments, UI text, test descriptions, commit messages, and AI-generated outputs MUST be written entirely in English.**

This rule applies to all current and future development activities, including `prompt.md` and `PROGRESS.md`.

- Use English exclusively. Do not use Thai or mix languages.
- Preserve technical terminology, identifiers, and code syntax.
- All future updates to `prompt.md` and `PROGRESS.md` must be in English.
- Translate any existing Thai content into English without changing its original meaning.
- Do not translate, rename, or modify technical identifiers.
- This requirement is mandatory and must remain consistent across AI sessions.

**English is the only permitted language for this project. No exceptions unless explicitly authorized by the user.**

### Source priority

1. Product Backlog defines included features.
2. Sprint Goal and Definition of Done define behavior within that scope.
3. Business Context and Story Map clarify purpose.
4. This prompt supplies technical guidance and explicitly classified assumptions.

Explicit user clarifications govern the decisions recorded here. The original backlog was supplied; the other source documents are known through the user's clarification, not independently reviewed originals. Do not claim otherwise.

Implement exactly **16 Story IDs**: `000`, `001`, `002-1`, `002-2`, `003-1`, `003-2`, `003-3`, `003-4`, `003-5`, `004-1`, `004-2`, `004-3`, `005-1`, `005-2`, `005-3`, `005-4`. References to “14 stories” were a counting error. Add or remove none. Original owners and estimates retained in Section 06 are historical metadata, not solo-development assignments.

### Included and excluded scope

Include project foundation, authentication/profile/password management, account administration, role/permission configuration and review, garment recording/assessment/evidence/recommendation/confirmation, and the supporting retrieval needed for the demo.

Exclude public signup, customer/credit management, completed resale, store CRUD, store associations/transfers, store-based authorization, pickup batches/FIFO, contractor receipt, sorting outcomes, final end-of-life tracking, sustainability validation/issue-resolution workflows, reports/exports/history, and reopening/audit-history interfaces. Future-module permission definitions are required by 004-2; their workflows are not.

### Genuine conflicts and their status

| Conflict | Status |
|---|---|
| Backlog Admin administration versus reported Sprint DoD Head/Developer administration | Source inconsistency remains. The user explicitly selected the backlog's ADMIN-only boundary for Sprint 1; BR-04 records that implementation decision. No fifth role. |
| Configurable permissions versus role-limited operations | Resolved by U-ACCESS in Section 04: roles define initial grants; supported operational access follows configured permissions and mandatory business constraints. Administration remains ADMIN-only. No store associations or store-based authorization. |
| Business rules presented as confirmed in earlier drafts | Corrected by the classifications in Section 04. Provisional rules are authorized for MVP use but not confirmed permanent policy. |

For a new blocking business ambiguity, ask a focused question and continue independent work. Record unanswered decisions briefly in the acceptance checklist. Successful tests against assumptions do not resolve business questions.

## 03 — Functional Requirements / User Stories

This section specifies capabilities and their interfaces. Section 04 owns business policy; Section 06 owns acceptance criteria. Each feature must provide appropriate loading, validation, error, and success feedback and expose only authorized actions/data.

### Foundation

- **000 — Project foundation:** Provide the local applications, database connectivity/migrations, environment settings, shared frontend API client, consistent backend errors, and initial roles/permissions required by Section 05.

### Authentication and self-service

- **001 — Sign in:** Authenticate by email/password with `POST /auth/login`; display failures and redirect to an available destination appropriate to the user's role. Include logout as supporting behavior.
- **002-1 — Manage own password:** Provide current/new/confirm password UI and `POST /auth/change-password`. Provide token-based recovery through `POST /auth/reset-password` and a reset page. Make token delivery usable through P-RECOVERY; keep this separate from 003-5.
- **002-2 — View own profile:** `GET /users/me` and Profile show the current account's name, email, role, and status; anonymous access is blocked.

### User Management

- **003-1 — View users:** `GET /users` feeds an administrative table showing name, email, role, and active/disabled status.
- **003-2 — Create users:** `POST /users` and Add User accept name, email, role, and initial password, without store associations. Refresh the table after success.
- **003-3 — Edit users:** `PATCH /users/{id}` and a prefilled Edit User form update the allowed profile fields in BR-04; show saved values.
- **003-4 — Disable/reactivate:** `PATCH /users/{id}/status` and table actions change account status according to BR-04.
- **003-5 — Admin reset password:** `POST /users/{id}/reset-password` accepts or generates a temporary password. Provide confirmation and an intentional result view if a password is generated.

### Role & Permission Management

- **004-1 — Assign roles:** `PATCH /users/{id}/role` and a role selector update the user's role subject to Section 04.
- **004-2 — Configure permissions:** Persist permissions and role grants; seed definitions for Account, Return, Batch, Outcome, Validation, and Report. Provide reusable `require_permission()`, `GET /roles/permissions`, and an atomic `PUT /roles/{role}/permissions`, plus a roles × permissions editor. Apply the resolved U-ACCESS policy to supported operational functions; reserved future-module keys must not enable unimplemented functionality.
- **004-3 — Review role access:** Reuse the permission read endpoint for a read-only view grouped by role, clearly showing allowed/blocked permissions and effective restrictions.

### Garment Return Routing

- **005-1 — Record garment:** `POST /garments` and Record Garment save the BR-02 fields, then show the generated ID and link to detail.
- **005-2 — Assess and upload evidence:** `PATCH /garments/{id}/condition` saves assessment; `POST /garments/{id}/evidence` saves validated files and metadata. Detail provides condition selection, upload/view controls, and the evidence requirement.
- **005-3 — Review recommendation:** `GET /garments/{id}` returns the saved recommendation; the Recommended Route card also handles an unassessed garment.
- **005-4 — Confirm/override:** `POST /garments/{id}/confirm-route` and Confirm/Override UI persist the final decision under BR-03.

### Supporting functions, not new stories

- Provide a minimal `/garments` list and `GET /garments` so authorized users can find draft/confirmed records without remembering URLs. Show ID, type, creation time, condition, and confirmed route or unconfirmed state; link rows to detail. Use a simple safe listing strategy; if paginated, all accessible records must remain reachable. No search, bulk actions, exports, or dashboard.
- Detail exposes safe basic data, condition, evidence references, recommendation, confirmed route/note/time. It supports resuming drafts and viewing confirmed records after refresh or a new session.
- Provide authorized evidence retrieval and an admin action to issue a recovery link. Suggested supporting paths: `POST /auth/logout`, `POST /users/{id}/reset-link`, `GET /garments/{id}/evidence/{evidence_id}`. Equivalent simple contracts are acceptable where not mandated by the backlog.

## 04 — Business Rules & Assumptions

This is the authoritative policy definition. UI, API, constraints, and tests must use these same rules; do not duplicate recommendation/evidence policy in frontend code.

### Confirmed Requirements

“Confirmed” includes explicit user-selected Sprint behavior; it does not imply every detail appeared in the original backlog.

- **BR-01 — Allowed values:** Roles are exactly `ADMIN`, `STORE_STAFF`, `CONTRACTOR`, `HEAD`; conditions exactly `GOOD`, `WORN`, `DAMAGED`, `STAINED`; destinations exactly `DIRECT_RESALE_CANDIDATE`, `THIRD_PARTY_CONTRACTOR`. A resale candidate is not a completed resale, and contractor routing is not a recycling outcome.
- **BR-02 — Garment data:** One record represents one item. Persist generated ID, required text type/material, positive finite weight in kilograms, creator, and creation time. Condition alone determines recommendation; no type/material routing rules.
- **BR-03 — Assessment and confirmation:** Creation saves an unassessed draft. Saving condition updates recommendation. Users with the corresponding permission may confirm the recommendation without a note or choose the other valid route with a nonblank trimmed override note. Confirmation requires assessment and any P-EVIDENCE proof, persists route/note/time, and makes the route and relevant assessment/evidence read-only. Reject repeated confirmation; retain view access. No reopening/revision workflow.
- **BR-04 — Account administration:** User/role/permission administration is ADMIN-only. General user edit allows name/email only; role, status, and password changes use designated actions. Prevent Admin self-disable and removing the last usable administrator's management access.
- **BR-05 — Self-service:** Every active role can authenticate, view its own profile, and manage its own password. Password change requires the current password. Recovery requires an unexpired unused valid token. Admin reset replaces another user's password with an accepted/generated temporary password. No forced first-login password change.
- **BR-06 — Authorization:** The four fixed roles define the initial permission matrix. ADMIN can configure role grants for supported operational functions; granted permissions enable the corresponding functionality on subsequent requests, subject to mandatory business constraints. Account, role, and permission administration remain ADMIN-only under BR-04. No implicit ADMIN bypass. Do not introduce store-based authorization, store associations, store ownership checks, or store-related access restrictions. Authentication/self-service remains available to active accounts. Garment list/detail/evidence share read authorization; reset-link issuance requires Admin reset authority. Reserved permissions do not enable unimplemented functionality. UI navigation, actions, and access review must reflect effective permissions, not merely assigned values.

Initial Sprint grants:

| Capability | ADMIN | STORE_STAFF | CONTRACTOR | HEAD |
|---|---|---|---|---|
| BR-05 self-service | Yes | Yes | Yes | Yes |
| BR-04 administration and access review | Yes | No | No | No |
| Record/read/assess garments, upload evidence, confirm/override | No | Yes | No | No |

This matrix defines initial grants, not permanent role restrictions on supported operational functions. ADMIN, HEAD, and CONTRACTOR initially lack Return access; granting the corresponding permissions enables those functions subject to BR-03 and other mandatory constraints. Administration remains ADMIN-only.

### User-Selected Provisional Assumptions

| ID | Authorized MVP behavior; not confirmed permanent policy |
|---|---|
| P-ROUTE | GOOD → DIRECT_RESALE_CANDIDATE; WORN/DAMAGED/STAINED → THIRD_PARTY_CONTRACTOR. |
| P-EVIDENCE | GOOD/WORN evidence optional; DAMAGED/STAINED evidence required before confirmation. Condition may be saved before uploading. Accepted formats are JPEG, PNG, WebP; size limit is a technical decision. |
| P-RECOVERY | Admin creates a short-lived single-use reset link for manual delivery. Provide the minimal issuing action and public token-reset form; no email infrastructure. |

### Resolved Business Decision

**U-ACCESS — Resolved:** Use permission-based authorization for supported operational functions as defined in BR-06. Roles establish initial grants; they do not prevent an authorized operational permission from taking effect. ADMIN may grant or revoke supported operational permissions for any of the four roles. Do not require further business clarification for these grants. No store associations or store-related access restrictions apply. Mandatory ADMIN-only administration and other business constraints still apply; reserved future permissions do not activate unimplemented workflows. The UI must show effective access.

## 05 — Architecture & Technical Constraints

### Domain-based modular monolith

Keep Next.js App Router + TypeScript; FastAPI + Pydantic; SQLAlchemy + Alembic; PostgreSQL. One backend application contains `auth`, `users`, `access_control`, and `returns` domains. Keep frontend features aligned to those domains.

```text
frontend/src/
  app/                  # Routes/layouts and page composition
  features/             # auth, users, access_control, returns
  components/ui/        # Small shared UI elements
  lib/                  # Shared API client and public configuration
backend/app/
  main.py               # App composition
  core/                 # Settings, database/session, security primitives, errors
  domains/              # auth, users, access_control, returns
  seed.py               # Idempotent setup
backend/alembic/
backend/tests/
frontend/tests/
docs/acceptance.md
PROGRESS.md
compose.yaml
.env.example
README.md
```

Within a domain, use routers, services, models, and schemas as needed. Routers validate/authorize and invoke services; services own business rules and transactions and may query SQLAlchemy directly. Models define persistence/constraints; schemas explicitly allow input/output fields. Dependencies resolve identity and enforce authorization. Returns owns recommendation policy and evidence storage. Core contains infrastructure, not domain policy.

Pages compose feature UI; feature code owns forms and domain API calls through the shared client. Avoid generic repositories/frameworks, speculative abstractions, and empty files. Choose simple compatible dependencies and reproducible versions. Non-mandated IDs, permission-key names, token lifetimes, password policy, upload limits, pagination, and transaction mechanisms are technical decisions, not new business rules.

### Frontend UX/UI design and inspiration

Use **shadcn/ui and Tailwind CSS** as the primary UI foundation. Create a cohesive, clean, modern, minimal enterprise interface suited to an internal tool. Favor readable content and efficient task completion over decoration.

Primary reference: [shadcn/ui Blocks](https://ui.shadcn.com/blocks); use [shadcn/ui Components](https://ui.shadcn.com/docs/components) for consistent controls and interaction patterns.

| Reference | Intended inspiration |
|---|---|
| `dashboard-01` | Application shell, content hierarchy, and data-table presentation; omit unrelated charts and metrics. |
| `sidebar-07` | Responsive authenticated navigation with a collapsible sidebar. |
| `login-03` | Focused authentication form and restrained page composition. |

Treat these as visual/interaction references, not mandatory templates or additional feature requirements. Adapt them to the actual account and return workflows. Do not import sample dashboards, signup, social login, team switching, charts, or other unrelated features merely because a reference includes them.

- Use a neutral light theme with restrained accent colors. Apply consistent typography, spacing, surfaces, borders, and component variants through the existing Tailwind/shadcn conventions; no custom design-system framework is needed.
- Reuse practical forms, tables, dialogs, badges, buttons, and feedback patterns across domains. Keep field labels, required-field indicators, inline validation, loading, empty, error, and success states consistent. Explain status with text, not color alone.
- Use a responsive, collapsible sidebar for authenticated navigation where useful, with an accessible mobile presentation. Navigation reflects permitted workflows while backend authorization remains authoritative. Keep the current location clear and primary actions easy to find.
- Make Record Garment, assessment save, and Confirm/Override actions visually clear. Distinguish recommended and confirmed routes, explain required evidence/override notes, and make confirmed read-only state apparent without changing business rules.
- Support keyboard operation, visible focus, meaningful control labels, readable contrast, and appropriate dialog focus behavior. Validation messages must identify the field/problem and be accessible to assistive technology.
- Ensure desktop, tablet, and mobile layouts remain usable: forms and dialogs fit the viewport; tables retain access to important data/actions through a suitable responsive layout or contained scrolling; navigation does not obscure the task.
- Add only components and visual dependencies needed for these workflows. Avoid unnecessary animations, visual libraries, and bespoke styling abstractions. Usability and accessibility take priority over visual imitation.

### Database and API boundaries

Use users, fixed roles, permissions, role_permissions, reset tokens, garments, and evidence metadata as required by their stories. No future-module business tables or store associations. Users reference a role; garments reference creator; evidence references garment/uploader. Keep recommendation distinct from confirmation. Persist only safe password/token representations as below.

Use Alembic, not runtime table creation. API and migrations share settings. Seed idempotently without resetting existing credentials or overwriting configured grants. Keep test fixtures separate. Document actual contracts through FastAPI/OpenAPI, with one shared error shape such as `{ "error": { "code": "...", "message": "...", "details": [] } }`. Use 401 for missing/invalid authentication and 403 for authorization denial; choose consistent appropriate validation/conflict/not-found statuses. Frontend API requests include credentials and handle these errors consistently.

### Security and integrity guarantees

- Hash passwords using an established library; validate consistently and never log plaintext credentials. Store JWTs only in HTTP-only cookies with appropriate expiry, SameSite, Secure settings, and matching deletion on logout; no JavaScript-accessible token storage.
- Validate JWT signature/expiry and load the current active user/role/grants. Disabled accounts cannot sign in or use existing sessions. Password changes/resets invalidate prior sessions by a simple suitable mechanism. Use generic credential failure messages.
- Configure explicit credentialed CORS origins and protect cookie-authenticated mutations against CSRF. UI visibility is not authorization.
- Store reset token hashes with user, expiry, and used state; consume atomically. Reveal reset links/temporary credentials only through intentional delivery results, not logs or ordinary responses.
- Normalize email and enforce database uniqueness, foreign keys, valid enum values, positive weight, and timezone-aware timestamps. Reject protected/unknown input fields. Do not return hashes, private storage paths, or stack traces.
- Keep condition/recommendation updates consistent and confirmation atomic. Concurrent writes must not bypass finality, token single use, uniqueness, or last-admin protection. Simple constraints/transactions/locking suffice.
- Validate evidence content/type/size, generate safe storage names, keep files outside public directories, and authorize upload/retrieval against the parent garment. Remove uploaded files if metadata persistence fails.
- Enforce effective operational permissions on list, detail, evidence, and mutation endpoints; do not rely on browser filtering. Do not add store or creator-ownership restrictions. Avoid unauthorized disclosure through detail, evidence, or counts.

### Host applications and PostgreSQL-only Docker

Create root `compose.yaml` with exactly one PostgreSQL service, persistent named volume, `pg_isready` health check, and loopback binding equivalent to `127.0.0.1:${POSTGRES_PORT:-5432}:5432`. Choose a supported image and correct data-volume path. FastAPI and Next.js run locally; no application containers, proxies, queues, or extra infrastructure.

Provide root `.env.example` for database name/user/password placeholders and `POSTGRES_PORT=5432`; backend `.env.example` for `DATABASE_URL`, JWT/cookie/CORS/upload settings; frontend `.env.example` for `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`. Ignore real secrets. Frontend uses `.env.local`, never database/private credentials.

For psycopg, a backend URL example is `postgresql+psycopg://garment_app:replace_me@localhost:5432/garment_returns`; install its compatible driver. FastAPI and Alembic load the same backend `.env`. Match Compose credentials and URL-encode passwords. If port 5432 is occupied, change the exposed port and URL together. Use host `localhost`, not the Compose service hostname. Browser origin is `http://localhost:3000`.

After documented environment copying, Python virtualenv/dependency setup, and Node dependency installation:

1. Root: `docker compose up -d`; wait for healthy PostgreSQL.
2. `backend/`, virtualenv active: `alembic upgrade head`.
3. `backend/`: `uvicorn app.main:app --reload`.
4. Separate terminal, `frontend/`: `npm run dev`.

Document the seed command after migrations and before first demo, with configured bootstrap admin credentials. Explain logs/health inspection and `docker compose down` retaining data. Volume deletion is destructive, not normal setup; changed initialization credentials do not automatically alter an existing database. Never delete developer data to make checks pass.

## 06 — Acceptance Criteria

Preserve these existing IDs. Each criterion inherits Section 04 policy and Section 05 guarantees; provisional references remain provisional. The associated Story ID is embedded in each AC ID. Functional contracts are in Section 03; verification procedure is in Section 08.

### 000 — Project foundation (Tartar; source estimate 9)

- **AC-000-01:** Next.js App Router/TypeScript and FastAPI run as host processes using the four documented startup commands and working directories. Compose runs PostgreSQL only, with a health check, loopback port binding, configurable host port, and persistent named volume.
- **AC-000-02:** Backend connects to PostgreSQL using SQLAlchemy and DATABASE_URL loaded from backend/.env; Alembic uses the same settings and creates the schema from an empty database with `alembic upgrade head`.
- **AC-000-03:** Environment examples cover database URL, JWT configuration, cookie/CORS settings, upload directory, and frontend API base URL without working secrets (examples use placeholders).
- **AC-000-04:** Shared frontend API client and standard backend error format are used by implemented features.
- **AC-000-05:** Repeated seeding preserves exactly the BR-01 roles and required permission definitions without duplication or overwriting configured grants/credentials; README covers migration, seed, startup, and test commands.

### 001 — Sign in (Wan; 10.5)

- **AC-001-01:** `users` persists ID, name, normalized email, password hash, role, and active status.
- **AC-001-02:** `POST /auth/login` verifies credentials and issues an HTTP-only cookie only for an active user.
- **AC-001-03:** Login form validates email/password, displays failures, and redirects by role/available access.
- **AC-001-04:** Active valid credentials succeed; wrong passwords, unknown or disabled accounts fail; unauthenticated protected access is denied.

### 002-1 — Manage own password (Chompoo; 11.5)

- **AC-002-1-01:** Authenticated `POST /auth/change-password` requires the correct current password and a valid new password; saves a new hash.
- **AC-002-1-02:** Change Password page has current/new/confirm fields and checks matching confirmation.
- **AC-002-1-03:** Reset-token persistence includes token hash, user reference, expiry, and used status/timestamp.
- **AC-002-1-04:** `POST /auth/reset-password` validates the token and password, atomically consumes the token, and changes the hash.
- **AC-002-1-05:** Reset Password page accepts the reset token and provides clear success/error states. A documented issuance path makes the flow usable end to end.
- **AC-002-1-06:** Wrong current password, invalid new password, and invalid/expired/used tokens leave the password unchanged; successful change/reset rejects the old password and protects token confidentiality as required in Section 05.

### 002-2 — Own profile (Pink; 4)

- **AC-002-2-01:** `GET /users/me` returns only the current user's safe basic information.
- **AC-002-2-02:** Profile displays name, email, role, and account status; unauthenticated access is blocked.
- **AC-002-2-03:** Each of the four roles receives its own correct profile; `/users/me` resolves to the current-user endpoint.

### 003-1 — View users (Fares; 5.5)

- **AC-003-1-01:** Admin-only `GET /users` returns safe account information.
- **AC-003-1-02:** User Management table displays name, email, role, and active/disabled status clearly, with loading, empty, and error states.
- **AC-003-1-03:** Non-admin API requests are denied even if they bypass the UI.

### 003-2 — Create users (Wan; 6.5)

- **AC-003-2-01:** Admin-only `POST /users` accepts name, email, an allowed role, and initial password, without store associations.
- **AC-003-2-02:** Validate required fields, password, duplicate normalized email, and invalid role.
- **AC-003-2-03:** Add User form displays actionable validation errors and refreshes the table on success.
- **AC-003-2-04:** A valid account is created once; duplicate email, invalid role, or missing required fields creates no account.

### 003-3 — Edit users (Tartar; 5)

- **AC-003-3-01:** Admin-only `PATCH /users/{id}` permits only explicitly editable profile fields.
- **AC-003-3-02:** Reject protected-field changes, invalid values, duplicate email, and missing users appropriately.
- **AC-003-3-03:** Edit User form is prefilled and updates the table after saving.
- **AC-003-3-04:** Valid updates persist; invalid updates and role/status/password mutations through this endpoint are rejected without changing the account.

### 003-4 — Disable/reactivate users (Chompoo; 5)

- **AC-003-4-01:** Admin-only `PATCH /users/{id}/status` updates `is_active`.
- **AC-003-4-02:** Reject an administrator disabling their own account.
- **AC-003-4-03:** Disable/Reactivate UI reflects the updated state; disabled users cannot log in or continue authenticated API access.
- **AC-003-4-04:** Disabling blocks login and existing sessions; reactivation permits login; self-disable leaves the account active.

### 003-5 — Admin reset password (Pink; 5)

- **AC-003-5-01:** Admin-only `POST /users/{id}/reset-password` accepts or securely generates a temporary password and saves only its hash.
- **AC-003-5-02:** User table includes Reset Password with confirmation and clear success/error feedback. If generated, show the temporary password only in the intentional result view and never in logs or account lists.
- **AC-003-5-03:** After reset, the old password fails and the new password works; non-admin reset attempts are denied.

### 004-1 — Assign roles (Fares; 4.5)

- **AC-004-1-01:** Admin-only `PATCH /users/{id}/role` validates against exactly the four roles; no store assignment is required.
- **AC-004-1-02:** Admin User Management includes a role selector and updates after saving.
- **AC-004-1-03:** Invalid roles are rejected; valid changes affect the next request in an existing session; demoting the last active administrator is rejected.

### 004-2 — Configure permissions (Tartar; 13)

- **AC-004-2-01:** Persist `permissions` and `role_permissions`; seed stable action keys grouped under Account, Return, Batch, Outcome, Validation, Report.
- **AC-004-2-02:** Define only the Account/Return action keys required by implemented endpoints. For the four future modules, seed clearly labeled reserved access keys without claiming their features exist.
- **AC-004-2-03:** Implement reusable `require_permission()` and use it on applicable protected endpoints.
- **AC-004-2-04:** Admin-only `GET /roles/permissions` returns the matrix; `PUT /roles/{role}/permissions` validates and atomically replaces that role's permissions. Reject unknown roles/keys.
- **AC-004-2-05:** Matrix UI shows roles × permissions, supports saving changes, surfaces failures, and distinguishes effective access from assigned values under mandatory constraints and reserved-module status.
- **AC-004-2-06:** Endpoint permission checks and initial grants are identifiable in code/OpenAPI; each role has an allowed and blocked action under Section 04, including denied Return access for ADMIN initially and enabled access after the corresponding grant, without an implicit permission bypass.
- **AC-004-2-07:** Permission edits affect the next request in existing sessions; edits that would lock out access administration are rejected.

### 004-3 — Review access (Wan; 4)

- **AC-004-3-01:** Reuse the matrix read endpoint for an admin-only read-only Role Access page grouped by role.
- **AC-004-3-02:** Display effective allowed and blocked access clearly, including mandatory restrictions and reserved future-module labels.
- **AC-004-3-03:** After a permission edit, the read-only view matches persisted values using the existing read contract.

### 005-1 — Record returned garment (Chompoo; 9)

- **AC-005-1-01:** Persist garment type and material as text, positive weight in kilograms, creator, creation timestamp, and generated ID. Each record represents one garment item.
- **AC-005-1-02:** `POST /garments` validates required fields and positive finite weight, derives creator from the current user, and checks Return permissions.
- **AC-005-1-03:** Record Returned Garment form shows successful creation, generated ID, and a link to garment detail.
- **AC-005-1-04:** Missing required fields, invalid weight, or creator spoofing are rejected; valid input from a user with the corresponding permission saves one garment without store association.
- **AC-005-1-05:** Provide the minimal list and safe `GET /garments` specified in Section 03; authorized users can find a saved record again without retaining its URL.

### 005-2 — Assess condition and attach evidence (Pink; 9.5)

- **AC-005-2-01:** Accept exactly the four conditions in BR-01; reject other condition values.
- **AC-005-2-02:** `PATCH /garments/{id}/condition` updates an authorized garment and triggers recommendation calculation.
- **AC-005-2-03:** Persist evidence metadata: original filename, internal storage path, garment ID, uploader; additional MIME/size/timestamp fields are acceptable when needed for validation.
- **AC-005-2-04:** `POST /garments/{id}/evidence` stores validated evidence and metadata; an authorized evidence retrieval endpoint supports viewing the uploaded result.
- **AC-005-2-05:** Garment detail includes condition selection, evidence uploader/list, and a visible explanation of conditional evidence requirements.
- **AC-005-2-06:** Draft condition changes and valid uploads succeed under P-EVIDENCE; invalid/oversized uploads and requests without the required permission are denied, with required evidence enforced at confirmation.

### 005-3 — Recommended route (Fares; 5.5)

- **AC-005-3-01:** Persist a BR-01 destination using P-ROUTE; changing a draft condition recalculates the recommendation.
- **AC-005-3-02:** `GET /garments/{id}` returns the safe garment detail, evidence metadata, and recommendation.
- **AC-005-3-03:** Recommended Route card handles both unassessed and assessed garments.
- **AC-005-3-04:** Each condition produces the P-ROUTE recommendation; before assessment the recommendation is absent.

### 005-4 — Confirm or override route (Tartar; 7)

- **AC-005-4-01:** Persist confirmed route, override reason/note, and confirmation timestamp.
- **AC-005-4-02:** `POST /garments/{id}/confirm-route` accepts an allowed final route and optional note.
- **AC-005-4-03:** Permit matching the recommendation without an override note; require a nonblank trimmed note when routes differ.
- **AC-005-4-04:** Reject confirmation before assessment, invalid routes, missing required evidence, unauthorized access, and repeated confirmation under BR-03.
- **AC-005-4-05:** UI supports both Confirm and Override, shows conditional note validation, and displays the saved final route.
- **AC-005-4-06:** Normal confirmation and a valid override succeed; blank override notes, missing required evidence, and post-confirmation assessment mutations are rejected.
- **AC-005-4-07:** Revisiting saved detail displays final route, note, condition, and evidence in read-only form.

## 07 — Implementation Strategy

Use one sequential workflow for a solo developer with AI assistance. Implement small vertical slices: necessary Database change → Backend → usable Frontend → Focused Testing. A slice need not change every layer when existing components suffice. Enforce authorization from each feature's first version.

Suggested dependency order:

1. 000/001/002-2 plus minimum permissions: local setup → login → profile → logout.
2. 003-1/003-2/005-1 plus basic detail: create Staff → sign in → record and retrieve a draft.
3. Condition part of 005-2 and 005-3: assess → see persisted recommendation.
4. Remaining 005-2 and 005-4: upload evidence → confirm/override → revisit saved detail.
5. 003-3/003-4/004-1: user edit, status, and role actions as small slices.
6. 002-1/003-5: change password, direct Admin reset, and token recovery as working slices.
7. Remaining 004-2/004-3: permission editing and access review; implement the resolved U-ACCESS policy for supported operational grants.
8. Final verification of all stories; no new scope.

After each slice run focused checks and relevant regressions, inspect the diff, and update acceptance evidence. Commit each successfully verified milestone on the existing branch with a clear behavior-based message. Stage only related files; preserve unrelated edits and exclude secrets/uploads/caches. No ownership assignments, PR gates, migration coordination, remote pushes, or parallel-agent workflow are required. Report blockers honestly and continue independent work.

Keep Alembic revisions simple/sequential, inspect generated changes, and preserve applied history. Record implementation decisions only when useful in README or code. Milestones are checkpoints, not permission to stop after the first demo. Choose straightforward internal details when requirements do not prescribe them.

### Development progress logging

Maintain a single root `PROGRESS.md` for continuity across AI development sessions. Keep it concise, accurate, and limited to these four sections:

- **DONE** — Work completed and verified; distinguish prototype verification from full-system completion.
- **CURRENT** — The current development phase and work in progress.
- **ISSUES** — Unresolved problems, blockers, and important decisions affecting implementation. Distinguish resolved decisions awaiting implementation from unresolved business questions.
- **NEXT** — The next actionable tasks.

Update the log only when a feature is completed and verified, an important requirement/design/technical decision changes, an unresolved issue needs recording, or a session ends. Do not log every command, code change, or minor adjustment.

At the beginning of each session, read `prompt.md` and `PROGRESS.md`, inspect the actual repository to verify the recorded progress, and continue from the latest state without unnecessarily repeating completed work. If the log does not yet exist, create it from verified repository state and available evidence.

At the end of each session, update all four sections to reflect the actual state and identify the next action. Move work from CURRENT to DONE only after verification. Keep unresolved issues visible until resolved; record implementation gaps when code or tests still reflect an earlier decision. Do not claim historical test results verify subsequently changed requirements.

Do not duplicate requirements from `prompt.md` or keep unnecessary history. `PROGRESS.md` is the only development progress log; `docs/acceptance.md` remains acceptance-test evidence, not a second session log.

## 08 — Verification & Definition of Done

### Test strategy

Use isolated PostgreSQL integration tests for persistence, validation, authorization, and integrity. Never reset a developer/user database. Unit-test pure rules when useful. Automate critical browser workflows without duplicating every backend edge case at browser level. A single meaningful test may cover multiple criteria; no arbitrary coverage percentage, load suite, or exhaustive concurrency framework is required.

Cover the success/rejection outcomes in Section 06 and these essential guarantees:

- All four roles authenticate; invalid/expired tokens, disabled sessions, and unauthenticated requests fail. Cookie/CSRF protection, logout, and safe responses work.
- Password changes and both resets reject old credentials/sessions; invalid/expired/used tokens do not mutate accounts. Token use is atomic.
- User mutations enforce uniqueness/protected fields and refresh UI; status/role changes affect subsequent requests; self-disable/last-admin protections hold.
- Matrix and read-only view match persisted grants; each role has an allowed/blocked action under initial configuration; supported revoke/restore takes effect without another login. Verify supported operational grants enable access for each role under resolved U-ACCESS; administration stays ADMIN-only and reserved grants enable no unimplemented functionality.
- Garments remain retrievable after a new session; routing/evidence use the provisional rules; invalid uploads, requests without the required permission, blank override notes, and post-confirmation edits fail. Authorized users can access records created by other users without store or creator-ownership restrictions.
- Targeted competing-write checks cover confirmation versus assessment and reset-token single use; verify remaining database/last-admin safeguards with focused tests. Protect supporting endpoints as well as main endpoints.

Verify the Section 05 UI guidance during these same workflows: desktop/tablet/mobile layout, keyboard navigation and visible focus, dialog behavior, clear validation/feedback, and reachable primary actions. Use focused browser assertions and a brief visual review; no separate visual-regression framework is required.

Critical browser coverage includes login/profile, password flows, account administration/access configuration, and the Sprint demo. For accepted operations assert persisted/read-back state; for invalid or denied mutations assert unchanged state and no unauthorized disclosure.

### Lightweight traceability

Maintain only these checklist columns in `docs/acceptance.md`:

| Story ID | AC ID | Test Reference | Result | Status |
|---|---|---|---|---|
| 001 | AC-001-02 | Actual test file/test name once implemented | Observed result | not run / passed / failed / blocked |

Use a row per AC; shared test references are acceptable. Include short open-decision and current/next-slice notes. Do not reproduce API/schema/UI matrices or business rules. Never mark an unrun check passed or a partially verified story complete.

### Demonstration and completion gate

Demonstrate Admin creates Staff → Staff signs in → records garment → saves assessment → reviews recommendation → uploads required evidence → confirms or overrides with a note → signs out/in → finds the record via the list → views the saved result. Separately demonstrate account actions, role/permission changes, recovery, and unauthorized-access rejection.

Before completion run the full implemented backend test suite, frontend type checking/lint/build, and critical browser suite. Verify clean-database Alembic migration, repeated seeding without resetting grants/credentials, PostgreSQL health/persistence, documented host startup, and an alternate host port once. No infrastructure test framework is necessary.

Completion requires passing evidence for all 16 stories and their ACs. If a decision or environment blocks a check, report the affected behavior/check as unresolved, blocked, or not run; a working demo alone is insufficient for a full-completion claim.

## 09 — Expected Deliverables

- Working Next.js frontend and FastAPI backend organized by the specified domains, with a cohesive responsive shadcn/ui + Tailwind interface meeting Section 05.
- PostgreSQL-only `compose.yaml`, persistent storage, and root/backend/frontend environment examples.
- SQLAlchemy models, Alembic migrations, and idempotent seed data with bootstrap instructions.
- Meaningful functional/integration tests and critical browser tests.
- README with reproducible prerequisites, setup, startup, migration/seed/test commands, technical defaults, data-preservation guidance, and manual reset-link delivery instructions.
- Lightweight acceptance checklist with actual evidence and remaining decisions.
- A concise root `PROGRESS.md` with DONE, CURRENT, ISSUES, and NEXT reflecting verified progress and the next action.
- Concise final report of implemented behavior, checks run/results, remaining blockers, and provisional assumptions still in use. Do not claim checks or business decisions were completed without evidence.
