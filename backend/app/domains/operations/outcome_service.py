"""Sorting results and final outcomes for a received batch."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import UploadFile
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.domains.operations.access import ensure_assignee, ensure_visible, granted_keys, lock_batch
from app.domains.operations.batch_service import field_error, present
from app.domains.operations.files import read_image, upload_dir, write_image
from app.domains.operations.models import (
    OUTCOME_CATEGORIES,
    FinalOutcome,
    FinalOutcomeItem,
    OutcomeEvidence,
    SortingResult,
)
from app.domains.operations.policy import quantize_kg
from app.domains.users.models import User


def _not_over(total: Decimal, limit: Decimal) -> None:
    if total > limit:
        raise AppError(
            422,
            "TOTAL",
            "The total weight cannot exceed the batch weight.",
            [{"field": "total", "message": "The total weight cannot exceed the batch weight."}],
        )


def _equal(total: Decimal, limit: Decimal, message: str) -> None:
    if total != limit:
        raise AppError(422, "TOTAL", message, [{"field": "total", "message": message}])


def _clean_kg(value: Decimal, field: str, *, allow_zero: bool) -> Decimal:
    if not value.is_finite():
        raise field_error(field, "Enter a finite weight in kilograms.")
    if value < 0:
        raise field_error(field, "Weight cannot be negative.")
    if not allow_zero and value <= 0:
        raise field_error(field, "Enter a weight greater than zero.")
    return quantize_kg(value)


def _received_assignee(db: Session, user: User, batch_id: str):
    batch = lock_batch(db, batch_id)
    ensure_visible(user, granted_keys(db, user), batch)
    ensure_assignee(user, batch)
    if batch.status != "RECEIVED":
        raise AppError(409, "STATE", "Record results after the batch has been received.")
    return batch


def save_sorting(
    db: Session,
    user: User,
    batch_id: str,
    resale_kg: Decimal,
    fibre_kg: Decimal,
    downcycling_kg: Decimal,
    unknown_kg: Decimal,
) -> dict:
    batch = _received_assignee(db, user, batch_id)
    parts = (
        _clean_kg(resale_kg, "resaleKg", allow_zero=True),
        _clean_kg(fibre_kg, "fibreToFibreKg", allow_zero=True),
        _clean_kg(downcycling_kg, "downcyclingKg", allow_zero=True),
        _clean_kg(unknown_kg, "unknownKg", allow_zero=True),
    )
    total = sum(parts, Decimal("0"))
    _not_over(total, batch.total_weight_kg)
    row = db.scalar(
        select(SortingResult).where(SortingResult.batch_id == batch.id).with_for_update()
    )
    if row is not None and row.status == "SUBMITTED":
        raise AppError(409, "READ_ONLY", "Submitted sorting results can no longer be changed.")
    if row is None:
        row = SortingResult(
            batch_id=batch.id,
            status="DRAFT",
            resale_kg=parts[0],
            fibre_to_fibre_kg=parts[1],
            downcycling_kg=parts[2],
            unknown_kg=parts[3],
            total_kg=total,
            created_by=user.id,
        )
        db.add(row)
    else:
        row.resale_kg, row.fibre_to_fibre_kg, row.downcycling_kg, row.unknown_kg = parts
        row.total_kg = total
        row.status = "DRAFT"
    db.commit()
    return present(db, user, batch)


def submit_sorting(db: Session, user: User, batch_id: str) -> dict:
    batch = _received_assignee(db, user, batch_id)
    row = db.scalar(
        select(SortingResult).where(SortingResult.batch_id == batch.id).with_for_update()
    )
    if row is None:
        raise AppError(409, "STATE", "Save sorting results before submitting them.")
    if row.status == "SUBMITTED":
        raise AppError(409, "READ_ONLY", "Submitted sorting results can no longer be changed.")
    total = row.resale_kg + row.fibre_to_fibre_kg + row.downcycling_kg + row.unknown_kg
    _equal(total, batch.total_weight_kg, "The sorting total must equal the batch weight before submission.")
    row.total_kg = total
    row.status = "SUBMITTED"
    row.submitted_at = datetime.now(UTC)
    row.submitted_by = user.id
    db.commit()
    return present(db, user, batch)


def _draft_outcome(db: Session, user: User, batch) -> FinalOutcome:
    row = db.scalar(
        select(FinalOutcome).where(FinalOutcome.batch_id == batch.id).with_for_update()
    )
    if row is not None and row.status == "SUBMITTED":
        raise AppError(409, "READ_ONLY", "Submitted final outcomes can no longer be changed.")
    if row is None:
        row = FinalOutcome(
            batch_id=batch.id,
            status="DRAFT",
            total_kg=Decimal("0"),
            created_by=user.id,
        )
        db.add(row)
        db.flush()
    return row


def save_outcomes(db: Session, user: User, batch_id: str, items: list[dict]) -> dict:
    batch = _received_assignee(db, user, batch_id)
    outcome = _draft_outcome(db, user, batch)
    cleaned: list[tuple[str, Decimal, str]] = []
    for index, item in enumerate(items):
        category = str(item["category"]).strip()
        if category not in OUTCOME_CATEGORIES:
            raise field_error(f"items.{index}.category", "Choose a valid end-of-life category.")
        weight = _clean_kg(item["weight"], f"items.{index}.weight", allow_zero=False)
        note = str(item.get("note", "")).strip()
        if len(note) > 500:
            raise field_error(f"items.{index}.note", "Keep the note to 500 characters or fewer.")
        cleaned.append((category, weight, note))
    total = sum((weight for _, weight, _ in cleaned), Decimal("0"))
    _not_over(total, batch.total_weight_kg)
    db.execute(delete(FinalOutcomeItem).where(FinalOutcomeItem.outcome_id == outcome.id))
    for category, weight, note in cleaned:
        db.add(
            FinalOutcomeItem(
                outcome_id=outcome.id,
                category=category,
                weight_kg=weight,
                note=note,
            )
        )
    outcome.total_kg = total
    outcome.status = "DRAFT"
    db.commit()
    return present(db, user, batch)


def add_outcome_evidence(db: Session, user: User, batch_id: str, upload: UploadFile) -> dict:
    batch = _received_assignee(db, user, batch_id)
    outcome = _draft_outcome(db, user, batch)
    content, mime, filename = read_image(upload)
    storage_name = write_image(content, mime)
    try:
        db.add(
            OutcomeEvidence(
                outcome_id=outcome.id,
                original_filename=filename,
                storage_name=storage_name,
                mime_type=mime,
                size_bytes=len(content),
                uploaded_by=user.id,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        (upload_dir() / storage_name).unlink(missing_ok=True)
        raise
    return present(db, user, batch)


def outcome_evidence_path(
    db: Session,
    user: User,
    batch_id: str,
    evidence_id: str,
):
    batch = lock_batch(db, batch_id)
    ensure_visible(user, granted_keys(db, user), batch)
    try:
        parsed = uuid.UUID(evidence_id)
    except ValueError as exc:
        raise AppError(404, "NOT_FOUND", "The evidence file was not found.") from exc
    evidence = db.get(OutcomeEvidence, parsed)
    outcome = db.scalar(select(FinalOutcome).where(FinalOutcome.batch_id == batch.id))
    if evidence is None or outcome is None or evidence.outcome_id != outcome.id:
        raise AppError(404, "NOT_FOUND", "The evidence file was not found.")
    path = upload_dir() / evidence.storage_name
    if not path.is_file():
        raise AppError(404, "NOT_FOUND", "The evidence file was not found.")
    return path, evidence.mime_type, evidence.original_filename


def submit_outcomes(db: Session, user: User, batch_id: str) -> dict:
    batch = _received_assignee(db, user, batch_id)
    outcome = db.scalar(
        select(FinalOutcome).where(FinalOutcome.batch_id == batch.id).with_for_update()
    )
    if outcome is None:
        raise AppError(409, "STATE", "Save final outcomes before submitting them.")
    if outcome.status == "SUBMITTED":
        raise AppError(409, "READ_ONLY", "Submitted final outcomes can no longer be changed.")
    weights = list(
        db.scalars(select(FinalOutcomeItem.weight_kg).where(FinalOutcomeItem.outcome_id == outcome.id))
    )
    if not weights:
        raise AppError(409, "STATE", "Add at least one outcome row before submitting.")
    total = sum(weights, Decimal("0"))
    _equal(
        total,
        batch.total_weight_kg,
        "The final outcome total must equal the batch weight before submission.",
    )
    outcome.total_kg = total
    outcome.status = "SUBMITTED"
    outcome.submitted_at = datetime.now(UTC)
    outcome.submitted_by = user.id
    db.commit()
    return present(db, user, batch)
