"""Operational HTTP routes for batches, outcomes, validation, issues, and reports."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_any_permission, require_permission
from app.core.security import require_csrf
from app.domains.operations import batch_service, outcome_service, oversight_service
from app.domains.users.models import User

router = APIRouter(tags=["operations"])


class BatchCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    storeCode: str
    contractorId: uuid.UUID
    plannedPickupAt: datetime
    maxItems: int | None = None


class PickupIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pickedUpAt: datetime | None = None


class SortingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resaleKg: Decimal
    fibreToFibreKg: Decimal
    downcyclingKg: Decimal
    unknownKg: Decimal


class OutcomeItemIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str
    weight: Decimal
    note: str = ""


class OutcomesIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[OutcomeItemIn]


class DecisionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: str
    reason: str = ""


class IssueIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    batchId: str
    assigneeId: uuid.UUID
    message: str


class MessageIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = ""


class ReportIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    periodStart: date
    periodEnd: date
    storeCode: str | None = None
    contractorId: uuid.UUID | None = None


def _filters(
    status: str | None,
    store_code: str | None,
    contractor_id: uuid.UUID | None,
    date_from: date | None,
    date_to: date | None,
) -> dict:
    return {
        "status": status,
        "store_code": store_code,
        "contractor_id": contractor_id,
        "date_from": date_from,
        "date_to": date_to,
    }


@router.get("/stores")
def read_stores(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    return oversight_service.list_stores(db)


@router.get("/contractors")
def read_contractors(
    _: User = Depends(
        require_any_permission("batch.create", "issues.manage", "report.configure")
    ),
    db: Session = Depends(get_db),
) -> list[dict]:
    return oversight_service.list_contractors(db)


@router.get("/assignees")
def read_assignees(
    _: User = Depends(require_permission("issues.manage")),
    db: Session = Depends(get_db),
) -> list[dict]:
    return oversight_service.list_assignees(db)


@router.get("/batches")
def read_batches(
    status: str | None = None,
    storeCode: str | None = None,
    contractorId: uuid.UUID | None = None,
    dateFrom: date | None = None,
    dateTo: date | None = None,
    user: User = Depends(
        require_any_permission("batch.read", "batch.receive", "batch.monitor", "batch.create")
    ),
    db: Session = Depends(get_db),
) -> list[dict]:
    return batch_service.query_batches(
        db,
        user,
        **_filters(status, storeCode, contractorId, dateFrom, dateTo),
    )


@router.post("/batches", status_code=201)
def add_batch(
    body: BatchCreate,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("batch.create")),
    db: Session = Depends(get_db),
) -> dict:
    return batch_service.create_batch(
        db,
        user,
        body.storeCode,
        body.contractorId,
        body.plannedPickupAt,
        body.maxItems,
    )


@router.get("/monitoring")
def read_monitoring(
    status: str | None = None,
    storeCode: str | None = None,
    contractorId: uuid.UUID | None = None,
    dateFrom: date | None = None,
    dateTo: date | None = None,
    user: User = Depends(require_permission("batch.monitor")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.monitoring(
        db,
        user,
        **_filters(status, storeCode, contractorId, dateFrom, dateTo),
    )


@router.get("/batches/{batch_id}")
def read_batch(
    batch_id: str,
    user: User = Depends(
        require_any_permission(
            "batch.read",
            "batch.monitor",
            "batch.receive",
            "outcome.sorting",
            "outcome.final",
        )
    ),
    db: Session = Depends(get_db),
) -> dict:
    return batch_service.get_batch(db, user, batch_id)


@router.delete("/batches/{batch_id}/items/{garment_id}")
def delete_item(
    batch_id: str,
    garment_id: str,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("batch.create")),
    db: Session = Depends(get_db),
) -> dict:
    return batch_service.remove_item(db, user, batch_id, garment_id)


@router.post("/batches/{batch_id}/confirm")
def confirm(
    batch_id: str,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("batch.confirm")),
    db: Session = Depends(get_db),
) -> dict:
    return batch_service.confirm_batch(db, user, batch_id)


@router.post("/batches/{batch_id}/pickup")
def pickup(
    batch_id: str,
    body: PickupIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("batch.pickup")),
    db: Session = Depends(get_db),
) -> dict:
    return batch_service.pickup_batch(db, user, batch_id, body.pickedUpAt)


@router.post("/batches/{batch_id}/receive")
def receive(
    batch_id: str,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("batch.receive")),
    db: Session = Depends(get_db),
) -> dict:
    return batch_service.receive_batch(db, user, batch_id)


@router.put("/batches/{batch_id}/sorting")
def save_sorting(
    batch_id: str,
    body: SortingIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("outcome.sorting")),
    db: Session = Depends(get_db),
) -> dict:
    return outcome_service.save_sorting(
        db,
        user,
        batch_id,
        body.resaleKg,
        body.fibreToFibreKg,
        body.downcyclingKg,
        body.unknownKg,
    )


@router.post("/batches/{batch_id}/sorting/submit")
def submit_sorting(
    batch_id: str,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("outcome.sorting")),
    db: Session = Depends(get_db),
) -> dict:
    return outcome_service.submit_sorting(db, user, batch_id)


@router.put("/batches/{batch_id}/outcomes")
def save_outcomes(
    batch_id: str,
    body: OutcomesIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("outcome.final")),
    db: Session = Depends(get_db),
) -> dict:
    return outcome_service.save_outcomes(
        db,
        user,
        batch_id,
        [item.model_dump() for item in body.items],
    )


@router.post("/batches/{batch_id}/outcomes/evidence")
def upload_outcome_evidence(
    batch_id: str,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("outcome.final")),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
) -> dict:
    return outcome_service.add_outcome_evidence(db, user, batch_id, file)


@router.get("/batches/{batch_id}/outcomes/evidence/{evidence_id}")
def download_outcome_evidence(
    batch_id: str,
    evidence_id: str,
    user: User = Depends(
        require_any_permission("outcome.final", "batch.read", "batch.monitor", "validation.read")
    ),
    db: Session = Depends(get_db),
) -> FileResponse:
    path, mime, filename = outcome_service.outcome_evidence_path(db, user, batch_id, evidence_id)
    return FileResponse(path, media_type=mime, filename=filename)


@router.post("/batches/{batch_id}/outcomes/submit")
def submit_outcomes(
    batch_id: str,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("outcome.final")),
    db: Session = Depends(get_db),
) -> dict:
    return outcome_service.submit_outcomes(db, user, batch_id)


@router.get("/batches/{batch_id}/validation")
def read_validation(
    batch_id: str,
    user: User = Depends(require_permission("validation.read")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.validation_detail(db, user, batch_id)


@router.post("/batches/{batch_id}/validation")
def decide(
    batch_id: str,
    body: DecisionIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("validation.decide")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.decide_validation(db, user, batch_id, body.decision, body.reason)


@router.get("/issues")
def read_issues(
    _: User = Depends(require_permission("issues.manage")),
    db: Session = Depends(get_db),
) -> list[dict]:
    return oversight_service.list_issues(db)


@router.get("/issues/mine")
def read_my_issues(
    user: User = Depends(require_permission("issues.respond")),
    db: Session = Depends(get_db),
) -> list[dict]:
    return oversight_service.list_my_issues(db, user)


@router.post("/issues", status_code=201)
def add_issue(
    body: IssueIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("issues.manage")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.create_issue(db, user, body.batchId, body.assigneeId, body.message)


@router.get("/issues/{issue_id}")
def read_issue(
    issue_id: str,
    user: User = Depends(require_any_permission("issues.manage", "issues.respond")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.get_issue(db, user, issue_id)


@router.post("/issues/{issue_id}/respond")
def respond(
    issue_id: str,
    body: MessageIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("issues.respond")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.respond_issue(db, user, issue_id, body.message)


@router.post("/issues/{issue_id}/resolve")
def resolve(
    issue_id: str,
    body: MessageIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("issues.manage")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.resolve_issue(db, user, issue_id, body.message)


@router.post("/issues/{issue_id}/reopen")
def reopen(
    issue_id: str,
    body: MessageIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("issues.manage")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.reopen_issue(db, user, issue_id, body.message)


@router.get("/reports")
def read_reports(
    _: User = Depends(require_permission("report.configure")),
    db: Session = Depends(get_db),
) -> list[dict]:
    return oversight_service.list_reports(db)


@router.get("/reports/preview")
def preview_report(
    periodStart: date,
    periodEnd: date,
    storeCode: str | None = None,
    contractorId: uuid.UUID | None = None,
    _: User = Depends(require_permission("report.configure")),
    db: Session = Depends(get_db),
) -> dict:
    return {
        "matchingCount": oversight_service.matching_count(
            db, periodStart, periodEnd, storeCode, contractorId
        )
    }


@router.post("/reports", status_code=201)
def add_report(
    body: ReportIn,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("report.configure")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.create_report(
        db,
        user,
        body.periodStart,
        body.periodEnd,
        body.storeCode,
        body.contractorId,
    )


@router.get("/reports/{report_id}")
def read_report(
    report_id: str,
    _: User = Depends(require_permission("report.configure")),
    db: Session = Depends(get_db),
) -> dict:
    return oversight_service.get_report(db, report_id)
