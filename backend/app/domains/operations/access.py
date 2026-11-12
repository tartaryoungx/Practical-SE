"""Batch visibility. Contractors are limited to their assignment."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import grants_for, permission_allows
from app.core.errors import AppError
from app.domains.operations.models import Batch
from app.domains.users.models import User

WIDE_KEYS = (
    "batch.monitor",
    "batch.create",
    "batch.confirm",
    "batch.pickup",
    "validation.read",
    "validation.decide",
    "issues.manage",
    "report.configure",
)


def granted_keys(db: Session, user: User) -> list[str]:
    return grants_for(db, user.role_code)


def sees_all_batches(user: User, granted: list[str]) -> bool:
    if user.role_code == "CONTRACTOR":
        return False
    return any(permission_allows(user, key, granted) for key in WIDE_KEYS)


def ensure_visible(user: User, granted: list[str], batch: Batch) -> None:
    if user.role_code == "CONTRACTOR":
        if batch.contractor_id != user.id:
            raise AppError(404, "NOT_FOUND", "The batch was not found.")
        return
    if sees_all_batches(user, granted) or batch.contractor_id == user.id:
        return
    raise AppError(404, "NOT_FOUND", "The batch was not found.")


def ensure_assignee(user: User, batch: Batch) -> None:
    if batch.contractor_id != user.id:
        raise AppError(403, "FORBIDDEN", "Only the assigned contractor can perform this action.")


def lock_batch(db: Session, batch_id: str) -> Batch:
    batch = db.scalar(select(Batch).where(Batch.id == batch_id).with_for_update())
    if batch is None:
        raise AppError(404, "NOT_FOUND", "The batch was not found.")
    return batch
