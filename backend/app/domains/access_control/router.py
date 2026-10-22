"""Permission matrix routes."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_permission
from app.core.errors import AppError
from app.core.security import require_csrf
from app.domains.access_control.catalog import PERMISSION_KEYS
from app.domains.access_control.models import ROLE_CODES, RolePermission
from app.domains.users.models import User
from app.domains.users.service import grants_matrix

router = APIRouter(prefix="/roles", tags=["access"])


class GrantsIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    permissions: list[str]


@router.get("/permissions")
def read_permissions(
    _: User = Depends(require_permission("access.read")),
    db: Session = Depends(get_db),
) -> dict[str, list[str]]:
    return grants_matrix(db)


@router.put("/{role}/permissions")
def replace_permissions(
    role: str,
    body: GrantsIn,
    _: None = Depends(require_csrf),
    __: User = Depends(require_permission("access.write")),
    db: Session = Depends(get_db),
) -> dict[str, list[str]]:
    if role not in ROLE_CODES:
        raise AppError(422, "VALIDATION", "Choose one of the four roles.")
    unknown = [key for key in body.permissions if key not in PERMISSION_KEYS]
    if unknown:
        raise AppError(422, "VALIDATION", "One or more permission keys are unknown.")
    keys = list(dict.fromkeys(body.permissions))
    if role == "ADMIN" and not {"access.read", "access.write"} <= set(keys):
        raise AppError(
            409,
            "LAST_ADMIN",
            "Administrators must keep access to read and edit permissions.",
        )
    db.execute(delete(RolePermission).where(RolePermission.role_code == role))
    for key in keys:
        db.add(RolePermission(role_code=role, permission_key=key))
    db.commit()
    return grants_matrix(db)
