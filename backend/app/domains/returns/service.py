"""Garment recording, assessment, evidence, and confirmation."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.returns.models import CONDITIONS, ROUTES, EvidenceFile, Garment
from app.domains.returns.policy import ACCEPTED_TYPES, UPLOAD_LIMIT, evidence_required, recommendation_for
from app.domains.users.models import User

SIGNATURES = {
    "image/png": lambda data: data.startswith(b"\x89PNG"),
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/webp": lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP",
}


def garment_out(db: Session, garment: Garment) -> dict:
    evidence = db.scalars(
        select(EvidenceFile)
        .where(EvidenceFile.garment_id == garment.id)
        .order_by(EvidenceFile.created_at)
    ).all()
    return {
        "id": garment.id,
        "type": garment.type,
        "material": garment.material,
        "weight": float(garment.weight_kg),
        "creatorId": str(garment.created_by),
        "createdAt": garment.created_at.isoformat(),
        "condition": garment.condition,
        "recommendation": garment.recommendation,
        "confirmedRoute": garment.confirmed_route,
        "note": garment.override_note,
        "confirmedAt": garment.confirmed_at.isoformat() if garment.confirmed_at else None,
        "evidenceRequired": evidence_required(garment.condition),
        "evidence": [
            {
                "id": str(item.id),
                "filename": item.original_filename,
                "mime": item.mime_type,
                "size": item.size_bytes,
                "uploaderId": str(item.uploaded_by),
                "createdAt": item.created_at.isoformat(),
            }
            for item in evidence
        ],
    }


def _field(field: str, message: str) -> AppError:
    return AppError(422, "VALIDATION", message, [{"field": field, "message": message}])


def _lock(db: Session, garment_id: str) -> Garment:
    garment = db.scalar(select(Garment).where(Garment.id == garment_id).with_for_update())
    if garment is None:
        raise AppError(404, "NOT_FOUND", "The garment was not found.")
    return garment


def _ensure_draft(garment: Garment) -> None:
    if garment.confirmed_route is not None:
        raise AppError(
            409,
            "READ_ONLY",
            "This garment is confirmed and can no longer be changed.",
        )


def create_garment(db: Session, user: User, garment_type: str, material: str, weight: float) -> Garment:
    garment_type = garment_type.strip()
    material = material.strip()
    if not garment_type:
        raise _field("type", "Enter the garment type.")
    if not material:
        raise _field("material", "Enter the material.")
    if weight != weight or weight <= 0 or weight == float("inf"):
        raise _field("weight", "Weight must be a positive finite number of kilograms.")
    number = db.execute(text("SELECT nextval('garment_seq')")).scalar_one()
    garment = Garment(
        id=f"GR-{int(number):04d}",
        type=garment_type,
        material=material,
        weight_kg=Decimal(str(weight)),
        created_by=user.id,
        condition=None,
        recommendation=None,
        confirmed_route=None,
        override_note="",
        confirmed_at=None,
    )
    db.add(garment)
    db.commit()
    db.refresh(garment)
    return garment


def list_garments(db: Session) -> list[Garment]:
    return list(db.scalars(select(Garment).order_by(Garment.created_at.desc(), Garment.id.desc())))


def get_garment(db: Session, garment_id: str) -> Garment:
    garment = db.get(Garment, garment_id)
    if garment is None:
        raise AppError(404, "NOT_FOUND", "The garment was not found.")
    return garment


def assess(db: Session, garment_id: str, condition: str) -> Garment:
    if condition not in CONDITIONS:
        raise AppError(422, "VALIDATION", "Choose a valid condition.")
    garment = _lock(db, garment_id)
    _ensure_draft(garment)
    garment.condition = condition
    garment.recommendation = recommendation_for(condition)
    db.commit()
    db.refresh(garment)
    return garment


def _upload_dir() -> Path:
    settings = get_settings()
    path = Path(settings.upload_dir)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_evidence(db: Session, user: User, garment_id: str, upload: UploadFile) -> Garment:
    garment = _lock(db, garment_id)
    _ensure_draft(garment)
    mime = upload.content_type or ""
    if mime not in ACCEPTED_TYPES:
        raise AppError(422, "UPLOAD", "Choose a JPEG, PNG, or WebP image up to 5 MB.")
    content = upload.file.read(UPLOAD_LIMIT + 1)
    if not content or len(content) > UPLOAD_LIMIT or not SIGNATURES[mime](content):
        raise AppError(422, "UPLOAD", "Choose a JPEG, PNG, or WebP image up to 5 MB.")
    storage_name = f"{uuid.uuid4().hex}.{ACCEPTED_TYPES[mime]}"
    destination = _upload_dir() / storage_name
    destination.write_bytes(content)
    filename = Path(upload.filename or "evidence").name[:255] or "evidence"
    try:
        db.add(
            EvidenceFile(
                garment_id=garment.id,
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
        destination.unlink(missing_ok=True)
        raise
    db.refresh(garment)
    return garment


def evidence_path(db: Session, garment_id: str, evidence_id: str) -> tuple[Path, str, str]:
    get_garment(db, garment_id)
    try:
        parsed = uuid.UUID(evidence_id)
    except ValueError as exc:
        raise AppError(404, "NOT_FOUND", "The evidence file was not found.") from exc
    item = db.get(EvidenceFile, parsed)
    if item is None or item.garment_id != garment_id:
        raise AppError(404, "NOT_FOUND", "The evidence file was not found.")
    path = _upload_dir() / item.storage_name
    if not path.is_file():
        raise AppError(404, "NOT_FOUND", "The evidence file was not found.")
    return path, item.mime_type, item.original_filename


def confirm_route(db: Session, garment_id: str, route: str, note: str) -> Garment:
    if route not in ROUTES:
        raise AppError(422, "VALIDATION", "Choose a valid route.")
    garment = _lock(db, garment_id)
    _ensure_draft(garment)
    if garment.condition is None or garment.recommendation is None:
        raise AppError(409, "ASSESSMENT", "Save a condition before confirming the route.")
    count = db.scalar(
        select(EvidenceFile.id).where(EvidenceFile.garment_id == garment.id).limit(1)
    )
    if evidence_required(garment.condition) and count is None:
        raise AppError(409, "EVIDENCE", "This condition requires an image before confirmation.")
    trimmed = note.strip()
    if route != garment.recommendation and not trimmed:
        raise _field("note", "Enter a reason when the route differs from the recommendation.")
    garment.confirmed_route = route
    garment.override_note = trimmed
    garment.confirmed_at = datetime.now(UTC)
    db.commit()
    db.refresh(garment)
    return garment
