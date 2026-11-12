"""Monitoring, validation, data issues, and draft report configuration."""

import uuid
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import permission_allows
from app.core.errors import AppError
from app.domains.operations.access import ensure_visible, granted_keys, lock_batch
from app.domains.operations.batch_service import field_error, iso, next_code, query_batches, summarize
from app.domains.operations.models import (
    Batch,
    BatchItem,
    BatchValidation,
    DataIssue,
    FinalOutcome,
    FinalOutcomeItem,
    ReportConfiguration,
    SortingResult,
    Store,
)
from app.domains.returns.models import EvidenceFile, Garment
from app.domains.returns.policy import evidence_required
from app.domains.users.models import User


def monitoring(
    db: Session,
    user: User,
    *,
    status: str | None,
    store_code: str | None,
    contractor_id: uuid.UUID | None,
    date_from: date | None,
    date_to: date | None,
) -> dict:
    rows = query_batches(
        db,
        user,
        status=status,
        store_code=store_code,
        contractor_id=contractor_id,
        date_from=date_from,
        date_to=date_to,
    )
    return {"summary": summarize(rows), "batches": rows}


def validation_detail(db: Session, user: User, batch_id: str) -> dict:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise AppError(404, "NOT_FOUND", "The batch was not found.")
    ensure_visible(user, granted_keys(db, user), batch)
    return _validation_payload(db, batch)


def _validation_payload(db: Session, batch: Batch) -> dict:
    garments = list(
        db.scalars(
            select(Garment)
            .join(BatchItem, BatchItem.garment_id == Garment.id)
            .where(BatchItem.batch_id == batch.id)
        )
    )
    missing_condition = [garment.id for garment in garments if garment.condition is None]
    missing_evidence: list[str] = []
    for garment in garments:
        if not evidence_required(garment.condition):
            continue
        count = db.scalar(
            select(func.count())
            .select_from(EvidenceFile)
            .where(EvidenceFile.garment_id == garment.id)
        )
        if not count:
            missing_evidence.append(garment.id)
    sorting = db.scalar(select(SortingResult).where(SortingResult.batch_id == batch.id))
    sorting_total = None
    if sorting is not None:
        sorting_total = (
            sorting.resale_kg
            + sorting.fibre_to_fibre_kg
            + sorting.downcycling_kg
            + sorting.unknown_kg
        )
    outcome = db.scalar(select(FinalOutcome).where(FinalOutcome.batch_id == batch.id))
    outcome_total = None
    if outcome is not None:
        weights = db.scalars(
            select(FinalOutcomeItem.weight_kg).where(FinalOutcomeItem.outcome_id == outcome.id)
        ).all()
        outcome_total = sum(weights, Decimal("0"))
    batch_weight = batch.total_weight_kg
    condition_ok = bool(garments) and not missing_condition
    evidence_ok = bool(garments) and not missing_evidence
    sorting_ok = (
        sorting is not None
        and sorting.status == "SUBMITTED"
        and sorting_total == batch_weight
    )
    outcome_ok = (
        outcome is not None
        and outcome.status == "SUBMITTED"
        and outcome_total == batch_weight
    )
    checks = [
        {
            "key": "condition",
            "label": "Condition recorded for every garment",
            "passed": condition_ok,
            "detail": (
                f"All {len(garments)} garments have a condition."
                if condition_ok
                else "Condition is missing for: " + ", ".join(missing_condition or ["no garments"])
            ),
        },
        {
            "key": "evidence",
            "label": "Required condition evidence is attached",
            "passed": evidence_ok,
            "detail": (
                "Every garment that requires evidence has an image."
                if evidence_ok
                else "Required evidence is missing for: "
                + ", ".join(missing_evidence or ["no garments"])
            ),
        },
        {
            "key": "sorting",
            "label": "Submitted sorting total matches the batch weight",
            "passed": sorting_ok,
            "detail": _weight_detail(
                "Sorting results",
                sorting.status if sorting else None,
                sorting_total,
                batch_weight,
            ),
        },
        {
            "key": "outcomes",
            "label": "Submitted final outcome total matches the batch weight",
            "passed": outcome_ok,
            "detail": _weight_detail(
                "Final outcomes",
                outcome.status if outcome else None,
                outcome_total,
                batch_weight,
            ),
        },
    ]
    decision_row = db.scalar(select(BatchValidation).where(BatchValidation.batch_id == batch.id))
    all_passed = all(check["passed"] for check in checks)
    decision = decision_row.decision if decision_row else None
    return {
        "batchId": batch.id,
        "operationalStatus": batch.status,
        "batchWeight": float(batch_weight),
        "checks": checks,
        "decision": decision,
        "reason": decision_row.reason if decision_row else "",
        "decidedAt": iso(decision_row.decided_at) if decision_row else None,
        "fullyVerified": bool(decision == "VALID" and all_passed),
    }


def _weight_detail(label: str, status: str | None, total, batch_weight) -> str:
    if status is None:
        return f"{label} have not been recorded."
    shown = "not calculated" if total is None else f"{total} kg"
    if status != "SUBMITTED":
        return f"{label} are still a draft ({shown}). The batch weight is {batch_weight} kg."
    if total != batch_weight:
        return f"{label} total {shown}, which does not match the batch weight of {batch_weight} kg."
    return f"{label} are submitted and match the batch weight of {batch_weight} kg."


def decide_validation(db: Session, user: User, batch_id: str, decision: str, reason: str) -> dict:
    if decision not in {"VALID", "FLAGGED"}:
        raise field_error("decision", "Choose valid or flagged.")
    batch = lock_batch(db, batch_id)
    ensure_visible(user, granted_keys(db, user), batch)
    payload = _validation_payload(db, batch)
    cleaned = reason.strip()
    if decision == "VALID" and not all(check["passed"] for check in payload["checks"]):
        raise AppError(
            409,
            "INCOMPLETE",
            "Resolve every validation check before confirming the batch data.",
        )
    if decision == "FLAGGED" and not cleaned:
        raise field_error("reason", "Enter a reason for flagging this batch.")
    row = db.scalar(
        select(BatchValidation).where(BatchValidation.batch_id == batch.id).with_for_update()
    )
    if row is None:
        row = BatchValidation(
            batch_id=batch.id,
            decision=decision,
            reason=cleaned if decision == "FLAGGED" else "",
            decided_by=user.id,
            decided_at=datetime.now(UTC),
        )
        db.add(row)
    else:
        row.decision = decision
        row.reason = cleaned if decision == "FLAGGED" else ""
        row.decided_by = user.id
        row.decided_at = datetime.now(UTC)
    db.commit()
    return _validation_payload(db, batch)


def _people(rows: list[User]) -> list[dict]:
    return [
        {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role_code}
        for user in rows
    ]


def list_contractors(db: Session) -> list[dict]:
    rows = db.scalars(
        select(User)
        .where(User.role_code == "CONTRACTOR", User.is_active.is_(True))
        .order_by(User.name)
    ).all()
    return _people(list(rows))


def list_assignees(db: Session) -> list[dict]:
    rows = db.scalars(
        select(User)
        .where(User.role_code.in_(("STORE_STAFF", "CONTRACTOR")), User.is_active.is_(True))
        .order_by(User.name)
    ).all()
    return _people(list(rows))


def list_stores(db: Session) -> list[dict]:
    rows = db.scalars(select(Store).order_by(Store.name)).all()
    return [{"code": store.code, "name": store.name} for store in rows]


def _issue_out(db: Session, issue: DataIssue) -> dict:
    assignee = db.get(User, issue.assignee_id)
    requester = db.get(User, issue.requested_by)
    return {
        "id": issue.id,
        "batchId": issue.batch_id,
        "message": issue.message,
        "assigneeId": str(issue.assignee_id),
        "assigneeName": assignee.name if assignee else "",
        "assigneeRole": assignee.role_code if assignee else "",
        "status": issue.status,
        "requestedBy": str(issue.requested_by),
        "requestedByName": requester.name if requester else "",
        "response": issue.response_text,
        "respondedAt": iso(issue.responded_at),
        "resolutionNote": issue.resolution_note,
        "resolvedAt": iso(issue.resolved_at),
        "createdAt": iso(issue.created_at),
    }


def _visible_issue(db: Session, user: User, issue_id: str) -> DataIssue:
    issue = db.get(DataIssue, issue_id)
    if issue is None:
        raise AppError(404, "NOT_FOUND", "The data issue was not found.")
    granted = granted_keys(db, user)
    if permission_allows(user, "issues.manage", granted):
        return issue
    if issue.assignee_id == user.id and permission_allows(user, "issues.respond", granted):
        return issue
    raise AppError(404, "NOT_FOUND", "The data issue was not found.")


def list_issues(db: Session) -> list[dict]:
    rows = db.scalars(select(DataIssue).order_by(DataIssue.created_at.desc(), DataIssue.id.desc())).all()
    return [_issue_out(db, issue) for issue in rows]


def list_my_issues(db: Session, user: User) -> list[dict]:
    rows = db.scalars(
        select(DataIssue)
        .where(DataIssue.assignee_id == user.id)
        .order_by(DataIssue.created_at.desc(), DataIssue.id.desc())
    ).all()
    return [_issue_out(db, issue) for issue in rows]


def get_issue(db: Session, user: User, issue_id: str) -> dict:
    return _issue_out(db, _visible_issue(db, user, issue_id))


def create_issue(
    db: Session,
    user: User,
    batch_id: str,
    assignee_id: uuid.UUID,
    message: str,
) -> dict:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise field_error("batchId", "Choose a batch.")
    assignee = db.get(User, assignee_id)
    if (
        assignee is None
        or not assignee.is_active
        or assignee.role_code not in {"STORE_STAFF", "CONTRACTOR"}
    ):
        raise field_error("assigneeId", "Choose an active store staff member or contractor.")
    text = message.strip()
    if not text or len(text) > 2000:
        raise field_error("message", "Enter a correction request of at most 2000 characters.")
    issue = DataIssue(
        id=next_code(db, "issue_seq", "DI"),
        batch_id=batch.id,
        message=text,
        assignee_id=assignee.id,
        status="OPEN",
        requested_by=user.id,
        response_text="",
        resolution_note="",
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return _issue_out(db, issue)


def respond_issue(db: Session, user: User, issue_id: str, message: str) -> dict:
    issue = db.scalar(select(DataIssue).where(DataIssue.id == issue_id).with_for_update())
    if issue is None:
        raise AppError(404, "NOT_FOUND", "The data issue was not found.")
    _visible_issue(db, user, issue.id)
    if issue.assignee_id != user.id:
        raise AppError(403, "FORBIDDEN", "Only the assigned person can respond.")
    if issue.status not in {"OPEN", "REOPENED"}:
        raise AppError(409, "STATE", "This issue is not waiting for a response.")
    text = message.strip()
    if not text or len(text) > 2000:
        raise field_error("message", "Enter a response of at most 2000 characters.")
    issue.response_text = text
    issue.responded_at = datetime.now(UTC)
    issue.status = "RESPONDED"
    db.commit()
    db.refresh(issue)
    return _issue_out(db, issue)


def resolve_issue(db: Session, user: User, issue_id: str, note: str) -> dict:
    issue = db.scalar(select(DataIssue).where(DataIssue.id == issue_id).with_for_update())
    if issue is None:
        raise AppError(404, "NOT_FOUND", "The data issue was not found.")
    if issue.status != "RESPONDED":
        raise AppError(409, "STATE", "Resolve an issue after the assigned person responds.")
    cleaned = note.strip()
    if len(cleaned) > 2000:
        raise field_error("message", "Keep the note to 2000 characters or fewer.")
    issue.status = "RESOLVED"
    issue.resolution_note = cleaned
    issue.resolved_at = datetime.now(UTC)
    db.commit()
    db.refresh(issue)
    return _issue_out(db, issue)


def reopen_issue(db: Session, user: User, issue_id: str, note: str) -> dict:
    issue = db.scalar(select(DataIssue).where(DataIssue.id == issue_id).with_for_update())
    if issue is None:
        raise AppError(404, "NOT_FOUND", "The data issue was not found.")
    if issue.status not in {"RESPONDED", "RESOLVED"}:
        raise AppError(409, "STATE", "Reopen an issue after it has a response.")
    cleaned = note.strip()
    if not cleaned or len(cleaned) > 2000:
        raise field_error("message", "Enter why the issue is being reopened.")
    issue.status = "REOPENED"
    issue.resolution_note = cleaned
    issue.resolved_at = None
    db.commit()
    db.refresh(issue)
    return _issue_out(db, issue)


def _criteria(
    db: Session,
    period_start: date,
    period_end: date,
    store_code: str | None,
    contractor_id: uuid.UUID | None,
) -> tuple[date, date, str | None, uuid.UUID | None]:
    if period_end < period_start:
        raise field_error("periodEnd", "The period end must be on or after the start.")
    code = store_code.strip() if store_code else None
    if code and db.get(Store, code) is None:
        raise field_error("storeCode", "Choose a store.")
    if contractor_id is not None:
        contractor = db.get(User, contractor_id)
        if contractor is None or contractor.role_code != "CONTRACTOR":
            raise field_error("contractorId", "Choose a contractor.")
    return period_start, period_end, code, contractor_id


def matching_count(
    db: Session,
    period_start: date,
    period_end: date,
    store_code: str | None,
    contractor_id: uuid.UUID | None,
) -> int:
    start, end, code, contractor = _criteria(db, period_start, period_end, store_code, contractor_id)
    start_at = datetime.combine(start, time.min, tzinfo=UTC)
    end_at = datetime.combine(end + timedelta(days=1), time.min, tzinfo=UTC)
    stmt = (
        select(func.count())
        .select_from(Batch)
        .join(BatchValidation, BatchValidation.batch_id == Batch.id)
        .where(
            BatchValidation.decision == "VALID",
            Batch.planned_pickup_at >= start_at,
            Batch.planned_pickup_at < end_at,
        )
    )
    if code:
        stmt = stmt.where(Batch.store_code == code)
    if contractor is not None:
        stmt = stmt.where(Batch.contractor_id == contractor)
    return int(db.scalar(stmt) or 0)


def _report_out(db: Session, report: ReportConfiguration) -> dict:
    return {
        "id": report.id,
        "status": report.status,
        "periodStart": report.period_start.isoformat(),
        "periodEnd": report.period_end.isoformat(),
        "storeCode": report.store_code,
        "contractorId": str(report.contractor_id) if report.contractor_id else None,
        "matchingCount": matching_count(
            db,
            report.period_start,
            report.period_end,
            report.store_code,
            report.contractor_id,
        ),
        "createdAt": iso(report.created_at),
    }


def list_reports(db: Session) -> list[dict]:
    rows = db.scalars(
        select(ReportConfiguration).order_by(ReportConfiguration.created_at.desc(), ReportConfiguration.id.desc())
    ).all()
    return [_report_out(db, report) for report in rows]


def get_report(db: Session, report_id: str) -> dict:
    report = db.get(ReportConfiguration, report_id)
    if report is None:
        raise AppError(404, "NOT_FOUND", "The report configuration was not found.")
    return _report_out(db, report)


def create_report(
    db: Session,
    user: User,
    period_start: date,
    period_end: date,
    store_code: str | None,
    contractor_id: uuid.UUID | None,
) -> dict:
    start, end, code, contractor = _criteria(db, period_start, period_end, store_code, contractor_id)
    report = ReportConfiguration(
        id=next_code(db, "report_seq", "RC"),
        period_start=start,
        period_end=end,
        store_code=code,
        contractor_id=contractor,
        status="DRAFT",
        created_by=user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return _report_out(db, report)
