"""Request identity and permission checks."""

import uuid

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import decode_access_token
from app.core.settings import get_settings
from app.domains.access_control.catalog import ACCOUNT_KEYS
from app.domains.access_control.models import RolePermission
from app.domains.users.models import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    settings = get_settings()
    raw = request.cookies.get(settings.cookie_name)
    if not raw:
        raise AppError(401, "UNAUTHENTICATED", "Authentication is required.")
    payload = decode_access_token(raw)
    try:
        user_id = uuid.UUID(str(payload.get("sub")))
    except ValueError as exc:
        raise AppError(401, "UNAUTHENTICATED", "Authentication is required.") from exc
    user = db.get(User, user_id)
    if user is None or not user.is_active or user.token_version != payload.get("ver"):
        raise AppError(401, "UNAUTHENTICATED", "Authentication is required.")
    return user


def grants_for(db: Session, role: str) -> list[str]:
    return list(
        db.scalars(select(RolePermission.permission_key).where(RolePermission.role_code == role))
    )


def permission_allows(user: User, key: str, granted: list[str]) -> bool:
    if not user.is_active or key not in granted or key.endswith(".reserved"):
        return False
    if key in ACCOUNT_KEYS:
        return user.role_code == "ADMIN"
    return key.startswith("returns.")


def require_permission(key: str):
    def dependency(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not permission_allows(user, key, grants_for(db, user.role_code)):
            raise AppError(403, "FORBIDDEN", "You do not have access to this resource.")
        return user

    return dependency
