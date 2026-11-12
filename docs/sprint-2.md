# Sprint 2 scope addendum

This addendum is the source of truth for the Sprint 2 stories listed below. It overrides the Sprint 1 exclusions in `prompt.md` for those stories only. Stories 000 through 005-4, their business rules, and the existing account and garment behavior remain in force.

Sprint 2 does not add report generation, publishing, exports, report history, store administration screens, or store-based user authorization.

## Stories

| ID | Capability |
|---|---|
| 006-1 | Create a pickup batch from eligible garments in FIFO order |
| 006-2 | Review a draft batch and remove items, then recalculate quantity and weight |
| 006-3 | Confirm a non-empty draft, which locks editing |
| 006-4 | Record pickup only from ready for pickup |
| 007 | Assigned contractor lists, opens, and receives only that contractor's batch |
| 008-1 | Record sorting weights for resale, fibre-to-fibre recycling, downcycling, and unknown |
| 008-2 | Submit sorting when the total equals the batch weight, then lock editing |
| 009-1 | Record final outcome rows, categories, and outcome-level evidence |
| 009-2 | Submit final outcomes when the total equals the batch weight, then lock editing |
| 010-1 | Head monitors operational status separately from attention and validation |
| 010-2 | Filter batches by status, date range, store, and contractor, with the filters kept in the URL |
| 011-1 | Show condition, evidence, sorting, and outcome checks without calling incomplete data verified |
| 011-2 | Confirm valid data only when every check passes, or flag it with a reason |
| 012-1 | Head requests a correction and assigns it; other people see only their own issues |
| 012-2 | Assignee responds; Head resolves or reopens. States are OPEN, RESPONDED, RESOLVED, and REOPENED |
| 013-1 | Head saves a draft report configuration and sees how many validated batches match |

## Personas

| Persona | Problem | What the product does |
|---|---|---|
| Store staff | Confirmed contractor-bound garments need to leave the store as one pickup without being assigned twice | Create a FIFO batch for one store and one contractor, remove items, confirm, and record pickup |
| Contractor | Work must be limited to the batches assigned to them, and the material outcome is not the same thing as a route | Confirm receipt, record sorting categories, and record final outcomes with evidence on the outcome |
| Project head | Pickup delays and incomplete records are hard to see, and unverified numbers must not be treated as validated | Monitor status, delay, missing data, and flags; validate or flag; request corrections; configure a draft report |
| Administrator | Account administration is separate from operations | Existing user, role, and permission administration only |

## Data decisions

These are the minimum structures required by the stories. They are provisional operational choices, not a new store-management product.

- **P-STORE.** Reference stores `central`, `north`, and `east` are seeded. There is no store create/update/delete workflow. `garments.store_code` is optional. Existing garments stay unassigned (`NULL`) and are not attached to an invented store. A batch belongs to one store and only receives garments with that same code.
- **P-ELIGIBLE.** A garment can enter a batch only when it has a store, a confirmed route of `THIRD_PARTY_CONTRACTOR`, and no existing batch item. Direct resale candidates, drafts, and unassigned garments are excluded. FIFO order is `created_at` ascending, then garment id ascending. `batch_items.garment_id` is unique. Creation locks candidate rows so two concurrent batches cannot take the same garment.
- **P-ASSIGNMENT.** A batch stores `contractor_id`. Receipt, sorting, and final outcomes require that user. A user whose role is `CONTRACTOR` cannot list or open another contractor's batch. This is assignment enforcement, not store-based authorization. Staff and Head can view batches across stores.
- **P-STATUS.** Operational status is exactly `DRAFT`, `READY_FOR_PICKUP`, `PICKED_UP`, or `RECEIVED`. Attention flags (`PENDING`, `COMPLETED`, `MISSING`, `DELAYED`, `FLAGGED`) and the validation decision are separate.
- **P-DELAY.** A batch is delayed when its planned pickup time is in the past and pickup has not been recorded.
- **P-SORT.** Sorting stores four weights: resale, fibre-to-fibre, downcycling, and unknown. The server sums them. Negative values and a total above the batch weight are rejected. A draft may total less than the batch weight. Submission requires an exact match and then locks the record.
- **P-OUTCOME.** Final outcome rows use `RESOLD`, `FIBRE_TO_FIBRE`, `DOWNCYCLED`, `DISCARDED`, or `UNKNOWN`. Unknown is an explicit outcome, not a verified result. Evidence files belong to the outcome record and are validated with the same image rules as garment evidence. They are not garment evidence. Submission requires the row total to equal the batch weight. A submitted or unvalidated record is not presented as a verified sustainability outcome.
- **P-VALID.** The four checks are: every garment has a condition; every garment that requires evidence has it; sorting is submitted and matches the batch weight; final outcomes are submitted and match the batch weight. `fullyVerified` is true only when all four pass and the decision is `VALID`. Confirm valid is rejected while any check fails. Flag requires a non-blank reason.
- **P-REPORT.** A report configuration stores a period, an optional store, and an optional contractor. It stays `DRAFT`. The matching count includes a batch only when its validation decision is `VALID` and its planned pickup time falls in the inclusive period. An open, responded, or reopened data issue does not change that count. The written stories keep validation and correction requests separate, and they do not say an unresolved issue withdraws a `VALID` decision. Generating, publishing, exporting, or keeping report history is out of scope.
- **P-ISSUE.** Head assigns a correction to an active store staff user or contractor. The assignee can respond from `OPEN` or `REOPENED`. Head can resolve a response or reopen a responded or resolved issue.

## Permissions

Operational keys are seeded beside the existing catalog. A later seed inserts missing definitions and grants a new key only when that key itself is new. It does not restore a grant an administrator has removed.

| Role | Initial operational grants, in addition to existing Sprint 1 grants |
|---|---|
| STORE_STAFF | `batch.create`, `batch.read`, `batch.confirm`, `batch.pickup`, `issues.respond` |
| CONTRACTOR | `batch.read`, `batch.receive`, `outcome.sorting`, `outcome.final`, `issues.respond` |
| HEAD | `batch.read`, `batch.monitor`, `validation.read`, `validation.decide`, `issues.manage`, `report.configure` |
| ADMIN | Account administration only, unless an administrator grants an operational key |

Reserved keys still enable no workflow. Account administration remains ADMIN-only. Backend checks are required even when the interface hides an action. Contractor batch access is additionally limited to the assigned user.

## Interfaces

- `POST /garments` accepts an optional `storeCode`. The field is omitted from responses when it is empty, so unassigned Sprint 1 records stay unchanged.
- `GET /stores` returns the reference list. `GET /contractors` and `GET /assignees` return the people needed by batch and correction forms.
- Batch commands live under `/batches`. Monitoring lives at `GET /monitoring`. Validation lives at `/batches/{id}/validation`.
- Data issues live under `/issues` and `/issues/mine`.
- Draft report configuration lives under `/reports` and `GET /reports/preview`.

## Verification

Checked on 2026-11-12. The disposable-database suite in `backend/tests/test_sprint2.py` covers every story in the table above, including rejection cases. Playwright, against a separate `gr_browser_*` database, uploaded an outcome image through the workspace, retrieved the PNG, and confirmed it was not garment evidence. The same run confirmed a `VALID` batch with a new open correction request still counted as one matching batch. Report generation was not added. See `docs/acceptance.md`.

## Open question

A batch can be marked `VALID`, and therefore counted by a draft report, while a data issue on that batch is `OPEN` or `REOPENED`. The four validation checks do not look at issue status. Story 011 defines completeness as condition, required evidence, sorting total, and outcome total. Story 013-1 counts validated batches. Neither story says a later correction request makes the batch unverified. The implementation follows that written split. If a disputed batch should leave the matching count, that needs a new rule.
