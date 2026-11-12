"""Pickup batch creation, review, confirmation, pickup, and receipt."""

import uuid
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.domains.operations.access import (
    ensure_assignee,
    ensure_visible,
    granted_keys,
    lock_batch,
    sees_all_batches,
)
from app.domains.operations.models import (
    BATCH_STATUSES,
    Batch,
    BatchItem,
    BatchValidation,
    FinalOutcome,
    SortingResult,
    Store,
)
from app.domains.operations.policy import ELIGIBLE_ROUTE, attention_for
from app.domains.returns.models import Garment
from app.domains.users.models import User


def field_error(field: str, message: str) -> AppError:
    return AppError(422, "VALIDATION", message, [{"field": field, "message": message}])


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat()


def aware(value: datetime, field: str) -> datetime:
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        raise field_error(field, "Enter a date and time with a time zone.")
    return value.astimezone(UTC)


def next_code(db: Session, sequence: str, prefix: str) -> str:
    number = db.execute(text(f"SELECT nextval('{sequence}')")).scalar_one()
    return f"{prefix}-{int(number):04d}"


def _recalculate(db: Session, batch: Batch) -> None:
    weights = list(
        db.scalars(
            select(Garment.weight_kg)
            .join(BatchItem, BatchItem.garment_id == Garment.id)
            .where(BatchItem.batch_id == batch.id)
        )
    )
    batch.quantity = len(weights)
    batch.total_weight_kg = sum(weights, Decimal("0"))


def _indicators(db: Session, batch_ids: list[str]) -> dict[str, dict]:
    found = {
        batch_id: {"sorting": False, "outcome": False, "decision": None}
        for batch_id in batch_ids
    }
    if not batch_ids:
        return found
    for row in db.scalars(select(SortingResult).where(SortingResult.batch_id.in_(batch_ids))):
        found[row.batch_id]["sorting"] = row.status == "SUBMITTED"
    for row in db.scalars(select(FinalOutcome).where(FinalOutcome.batch_id.in_(batch_ids))):
        found[row.batch_id]["outcome"] = row.status == "SUBMITTED"
    for row in db.scalars(select(BatchValidation).where(BatchValidation.batch_id.in_(batch_ids))):
        found[row.batch_id]["decision"] = row.decision
    return found


def _directory(db: Session, batches: list[Batch]) -> tuple[dict, dict]:
    user_ids = {batch.contractor_id for batch in batches}
    store_codes = {batch.store_code for batch in batches}
    users = {}
    stores = {}
    if user_ids:
        users = {
            user.id: user for user in db.scalars(select(User).where(User.id.in_(user_ids)))
        }
    if store_codes:
        stores = {
            store.code: store
            for store in db.scalars(select(Store).where(Store.code.in_(store_codes)))
        }
    return users, stores


def summary_row(batch: Batch, users: dict, stores: dict, indicator: dict, now: datetime) -> dict:
    contractor = users.get(batch.contractor_id)
    store = stores.get(batch.store_code)
    decision = indicator.get("decision")
    return {
        "id": batch.id,
        "storeCode": batch.store_code,
        "storeName": store.name if store else batch.store_code,
        "contractorId": str(batch.contractor_id),
        "contractorName": contractor.name if contractor else "",
        "status": batch.status,
        "quantity": batch.quantity,
        "totalWeight": float(batch.total_weight_kg),
        "plannedPickupAt": iso(batch.planned_pickup_at),
        "pickedUpAt": iso(batch.picked_up_at),
        "receivedAt": iso(batch.received_at),
        "confirmedAt": iso(batch.confirmed_at),
        "createdAt": iso(batch.created_at),
        "attention": attention_for(
            status=batch.status,
            planned_pickup_at=batch.planned_pickup_at,
            now=now,
            sorting_submitted=bool(indicator.get("sorting")),
            outcome_submitted=bool(indicator.get("outcome")),
            flagged=decision == "FLAGGED",
        ),
        "validationDecision": decision,
    }


def summarize(rows: list[dict]) -> dict:
    by_status = {status: 0 for status in BATCH_STATUSES}
    counts = {"delayed": 0, "flagged": 0, "pending": 0, "missing": 0, "completed": 0}
    for row in rows:
        by_status[row["status"]] += 1
        attention = set(row["attention"])
        for key, flag in (
            ("delayed", "DELAYED"),
            ("flagged", "FLAGGED"),
            ("pending", "PENDING"),
            ("missing", "MISSING"),
            ("completed", "COMPLETED"),
        ):
            if flag in attention:
                counts[key] += 1
    return {"total": len(rows), "byStatus": by_status, **counts}


def query_batches(
    db: Session,
    user: User,
    *,
    status: str | None,
    store_code: str | None,
    contractor_id: uuid.UUID | None,
    date_from: date | None,
    date_to: date | None,
) -> list[dict]:
    granted = granted_keys(db, user)
    if user.role_code == "CONTRACTOR":
        if contractor_id is not None and contractor_id != user.id:
            raise AppError(403, "FORBIDDEN", "You can only view batches assigned to you.")
        contractor_id = user.id
    elif not sees_all_batches(user, granted) and not any(
        key in granted for key in ("batch.read", "batch.receive")
    ):
        raise AppError(403, "FORBIDDEN", "You do not have access to this resource.")
    if status and status not in BATCH_STATUSES:
        raise field_error("status", "Choose a valid batch status.")
    if date_from and date_to and date_to < date_from:
        raise field_error("dateTo", "The end date must be on or after the start date.")
    stmt = select(Batch).order_by(Batch.planned_pickup_at.asc(), Batch.id.asc())
    if status:
        stmt = stmt.where(Batch.status == status)
    if store_code:
        stmt = stmt.where(Batch.store_code == store_code)
    if contractor_id is not None:
        stmt = stmt.where(Batch.contractor_id == contractor_id)
    if date_from:
        stmt = stmt.where(
            Batch.planned_pickup_at >= datetime.combine(date_from, time.min, tzinfo=UTC)
        )
    if date_to:
        stmt = stmt.where(
            Batch.planned_pickup_at
            < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=UTC)
        )
    if user.role_code != "CONTRACTOR" and not sees_all_batches(user, granted):
        stmt = stmt.where(Batch.contractor_id == user.id)
    batches = list(db.scalars(stmt))
    users, stores = _directory(db, batches)
    indicators = _indicators(db, [batch.id for batch in batches])
    now = datetime.now(UTC)
    return [
        summary_row(batch, users, stores, indicators.get(batch.id, {}), now) for batch in batches
    ]


def detail(db: Session, user: User, batch: Batch) -> dict:
    granted = granted_keys(db, user)
    ensure_visible(user, granted, batch)
    users, stores = _directory(db, [batch])
    indicator = _indicators(db, [batch.id]).get(batch.id, {})
    payload = summary_row(batch, users, stores, indicator, datetime.now(UTC))
    rows = db.execute(
        select(BatchItem, Garment)
        .join(Garment, Garment.id == BatchItem.garment_id)
        .where(BatchItem.batch_id == batch.id)
        .order_by(BatchItem.position.asc(), Garment.created_at.asc(), Garment.id.asc())
    ).all()
    payload["editable"] = batch.status == "DRAFT"
    payload["items"] = [
        {
            "garmentId": garment.id,
            "type": garment.type,
            "material": garment.material,
            "weight": float(garment.weight_kg),
            "condition": garment.condition,
            "confirmedRoute": garment.confirmed_route,
            "createdAt": iso(garment.created_at),
            "position": item.position,
        }
        for item, garment in rows
    ]
    sorting = db.scalar(select(SortingResult).where(SortingResult.batch_id == batch.id))
    payload["sorting"] = None if sorting is None else _sorting_out(sorting)
    outcome = db.scalar(select(FinalOutcome).where(FinalOutcome.batch_id == batch.id))
    payload["finalOutcome"] = None if outcome is None else _outcome_out(db, outcome)
    validation = db.scalar(select(BatchValidation).where(BatchValidation.batch_id == batch.id))
    payload["validation"] = None if validation is None else {
        "decision": validation.decision,
        "reason": validation.reason,
        "decidedAt": iso(validation.decided_at),
    }
    return payload


def _sorting_out(sorting: SortingResult) -> dict:
    return {
        "status": sorting.status,
        "resaleKg": float(sorting.resale_kg),
        "fibreToFibreKg": float(sorting.fibre_to_fibre_kg),
        "downcyclingKg": float(sorting.downcycling_kg),
        "unknownKg": float(sorting.unknown_kg),
        "totalKg": float(sorting.total_kg),
        "submittedAt": iso(sorting.submitted_at),
    }


def _outcome_out(db: Session, outcome: FinalOutcome) -> dict:
    from app.domains.operations.models import FinalOutcomeItem, OutcomeEvidence

    items = db.scalars(
        select(FinalOutcomeItem)
        .where(FinalOutcomeItem.outcome_id == outcome.id)
        .order_by(FinalOutcomeItem.category, FinalOutcomeItem.id)
    ).all()
    evidence = db.scalars(
        select(OutcomeEvidence)
        .where(OutcomeEvidence.outcome_id == outcome.id)
        .order_by(OutcomeEvidence.created_at)
    ).all()
    return {
        "status": outcome.status,
        "totalKg": float(outcome.total_kg),
        "submittedAt": iso(outcome.submitted_at),
        "items": [
            {
                "id": str(item.id),
                "category": item.category,
                "weight": float(item.weight_kg),
                "note": item.note,
            }
            for item in items
        ],
        "evidence": [
            {
                "id": str(file.id),
                "filename": file.original_filename,
                "mime": file.mime_type,
                "size": file.size_bytes,
                "createdAt": iso(file.created_at),
            }
            for file in evidence
        ],
    }


def present(db: Session, user: User, batch: Batch) -> dict:
    db.refresh(batch)
    return detail(db, user, batch)


def _active_contractor(db: Session, contractor_id: uuid.UUID) -> User:
    contractor = db.get(User, contractor_id)
    if contractor is None or not contractor.is_active or contractor.role_code != "CONTRACTOR":
        raise field_error("contractorId", "Choose an active contractor.")
    return contractor


def _store(db: Session, store_code: str) -> Store:
    code = store_code.strip()
    store = db.get(Store, code)
    if store is None:
        raise field_error("storeCode", "Choose a store.")
    return store


def create_batch(
    db: Session,
    user: User,
    store_code: str,
    contractor_id: uuid.UUID,
    planned_pickup_at: datetime,
    max_items: int | None,
) -> dict:
    store = _store(db, store_code)
    _active_contractor(db, contractor_id)
    planned = aware(planned_pickup_at, "plannedPickupAt")
    if max_items is not None and max_items < 1:
        raise field_error("maxItems", "Enter a maximum of at least 1, or leave it empty.")
    allocated = select(BatchItem.garment_id)
    stmt = (
        select(Garment)
        .where(
            Garment.store_code == store.code,
            Garment.confirmed_route == ELIGIBLE_ROUTE,
            Garment.confirmed_at.is_not(None),
            Garment.id.not_in(allocated),
        )
        .order_by(Garment.created_at.asc(), Garment.id.asc())
        .with_for_update()
    )
    if max_items is not None:
        stmt = stmt.limit(max_items)
    garments = list(db.scalars(stmt))
    if not garments:
        raise AppError(409, "EMPTY", "No eligible garments are waiting for this store.")
    batch = Batch(
        id=next_code(db, "batch_seq", "PB"),
        store_code=store.code,
        contractor_id=contractor_id,
        status="DRAFT",
        quantity=len(garments),
        total_weight_kg=sum((garment.weight_kg for garment in garments), Decimal("0")),
        planned_pickup_at=planned,
        created_by=user.id,
    )
    db.add(batch)
    db.flush()
    for index, garment in enumerate(garments, start=1):
        db.add(BatchItem(batch_id=batch.id, garment_id=garment.id, position=index))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AppError(
            409,
            "CONFLICT",
            "One or more garments were already allocated to a batch.",
        ) from exc
    return present(db, user, batch)


def get_batch(db: Session, user: User, batch_id: str) -> dict:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise AppError(404, "NOT_FOUND", "The batch was not found.")
    return detail(db, user, batch)


def remove_item(db: Session, user: User, batch_id: str, garment_id: str) -> dict:
    batch = lock_batch(db, batch_id)
    ensure_visible(user, granted_keys(db, user), batch)
    if batch.status != "DRAFT":
        raise AppError(409, "READ_ONLY", "Confirmed batches can no longer be edited.")
    item = db.scalar(
        select(BatchItem).where(
            BatchItem.batch_id == batch.id,
            BatchItem.garment_id == garment_id,
        )
    )
    if item is None:
        raise AppError(404, "NOT_FOUND", "That garment is not in this batch.")
    db.delete(item)
    db.flush()
    _recalculate(db, batch)
    db.commit()
    return present(db, user, batch)


def confirm_batch(db: Session, user: User, batch_id: str) -> dict:
    batch = lock_batch(db, batch_id)
    ensure_visible(user, granted_keys(db, user), batch)
    if batch.status != "DRAFT":
        raise AppError(409, "STATE", "Only a draft batch can be confirmed.")
    _recalculate(db, batch)
    if batch.quantity < 1:
        raise AppError(409, "EMPTY", "Add at least one garment before confirming the batch.")
    batch.status = "READY_FOR_PICKUP"
    batch.confirmed_at = datetime.now(UTC)
    db.commit()
    return present(db, user, batch)


def pickup_batch(
    db: Session,
    user: User,
    batch_id: str,
    picked_up_at: datetime | None,
) -> dict:
    batch = lock_batch(db, batch_id)
    ensure_visible(user, granted_keys(db, user), batch)
    if batch.status != "READY_FOR_PICKUP":
        raise AppError(409, "STATE", "Record pickup only after the batch is ready for pickup.")
    batch.status = "PICKED_UP"
    batch.picked_up_at = aware(picked_up_at, "pickedUpAt") if picked_up_at else datetime.now(UTC)
    db.commit()
    return present(db, user, batch)


def receive_batch(db: Session, user: User, batch_id: str) -> dict:
    batch = lock_batch(db, batch_id)
    ensure_visible(user, granted_keys(db, user), batch)
    ensure_assignee(user, batch)
    if batch.status != "PICKED_UP":
        raise AppError(409, "STATE", "Confirm receipt only after pickup has been recorded.")
    batch.status = "RECEIVED"
    batch.received_at = datetime.now(UTC)
    db.commit()
    return present(db, user, batch)
