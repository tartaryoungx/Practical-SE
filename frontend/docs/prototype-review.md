# Prototype review — Sprint 1

Scope: UI/UX validation only. Original requirements/ACs remain in `../../prompt.md`; all 16 Story IDs are retained below. No claim of passing full-system ACs is made.

| Story ID | Prototype surface / behavior | Verification scope |
|---|---|---|
| 000 | Next.js, TS, Tailwind, shadcn controls, shared mock API/error shape | Frontend only; all backend/DB setup deferred |
| 001 | `/login`, role destination, logout, denied session | Mock + browser |
| 002-1 | `/change-password`, `/reset-password`, Admin-issued single-use link | Mock + browser; no secure token service |
| 002-2 | `/profile` for all four roles | Mock + browser |
| 003-1 | `/users`, safe account table | Mock + browser |
| 003-2 | Add user, normalized unique email, Staff store | Mock + browser |
| 003-3 | Name/email edit dialog | Mock + browser |
| 003-4 | Disable/reactivate confirmation, self-disable guard | Mock + browser |
| 003-5 | Intentional Admin temporary password reset | Mock; UI review available |
| 004-1 | Role selector and initial Staff store assignment | Mock; UI review available |
| 004-2 | `/permissions`, grouped controls, save/revoke/restore, lockout guard | Mock + browser; U-ACCESS still unresolved |
| 004-3 | `/access`, persisted configured grants vs effective restrictions | Browser |
| 005-1 | `/garments/new`, generated ID, same-store list/detail | Mock + browser |
| 005-2 | Saved condition, image validation, local image preview | Mock + browser; no server upload |
| 005-3 | Recommendation recalculated by condition; unassessed state | Mock + browser |
| 005-4 | Confirm/override, required note/evidence, immutable result, revisit | Mock + browser |

## Checks

Results are recorded after executing the corresponding commands. These tests validate the simulated prototype, not backend guarantees.

- Mock-service suite: 7 tests passed (roles/store boundaries, end-to-end saved result, routing/evidence rejection, account administration, permissions, password/recovery, temporary storage failures).
- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings/errors.
- `npm run build`: passed; all App Router routes generated successfully.
- `npm run test:browser`: 5 passed in installed headless Chrome: saved override + relogin, evidence rejection/upload/preview/confirmation, account administration + access readback + recovery, mobile password + denied route, responsive layouts + dialog keyboard focus restoration.
- Visual review: desktop list, tablet detail, and 390 px mobile detail inspected. No page-level horizontal overflow on the mobile detail/denied-route checks; data tables intentionally scroll inside their container.
- `npm audit --omit=dev`: zero runtime advisories. Full audit reports five high-severity entries in the development-only ESLint glob/braces dependency chain; the available automatic fix would downgrade Next ESLint configuration across major versions. No incompatible downgrade was applied. This is not a production security audit.

Review screenshots: [desktop list](screenshots/desktop-list.png), [mobile detail](screenshots/mobile-detail.png).

## Remaining decisions

U-ACCESS is unresolved and disabled in configuration, rather than silently granting or storing ineffective Return access. P-ROUTE/P-EVIDENCE/P-STORE/P-RECOVERY remain provisional. Review the interface and defaults in README before authorizing backend/database development.
