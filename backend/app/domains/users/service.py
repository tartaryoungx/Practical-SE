"""Shared account helpers."""

import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import hash_password, token_hash, validate_password, verify_password
from app.domains.access_control.models import ROLE_CODES, RolePermission
from app.domains.users.models import PasswordResetToken, User

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
CREDENTIALS = "The email or password is incorrect, or the account is unavailable."


def user_out(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role_code,
        "is_active": user.is_active,
    }


def grants_matrix(db: Session) -> dict[str, list[str]]:
    matrix = {role: [] for role in ROLE_CODES}
    rows = db.execute(select(RolePermission.role_code, RolePermission.permission_key)).all()
    for role, key in rows:
        matrix[role].append(key)
    return matrix


def session_out(db: Session, user: User) -> dict:
    return {"user": user_out(user), "grants": grants_matrix(db)}


def clean_name(value: str) -> str:
    name = value.strip()
    if not name or len(name) > 100:
        raise AppError(
            422,
            "VALIDATION",
            "Enter a name of at most 100 characters.",
            [{"field": "name", "message": "Enter a name of at most 100 characters."}],
        )
    return name


def clean_email(value: str, db: Session, ignore_id: uuid.UUID | None = None) -> str:
    email = value.strip().lower()
    if not EMAIL_RE.match(email):
        raise AppError(
            422,
            "VALIDATION",
            "Enter a valid email address.",
            [{"field": "email", "message": "Enter a valid email address."}],
        )
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None and existing.id != ignore_id:
        raise AppError(
            409,
            "CONFLICT",
            "An account with this email already exists.",
            [{"field": "email", "message": "This email is already in use."}],
        )
    return email


def require_role(role: str) -> str:
    if role not in ROLE_CODES:
        raise AppError(
            422,
            "VALIDATION",
            "Choose one of the four roles.",
            [{"field": "role", "message": "Choose a valid role."}],
        )
    return role


def lock_active_admins(db: Session) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .where(User.role_code == "ADMIN", User.is_active.is_(True))
            .with_for_update()
        )
    )


def protect_last_admin(admins: list[User], user: User, removing: bool) -> None:
    if removing and user.role_code == "ADMIN" and user.is_active and len(admins) == 1:
        raise AppError(
            409,
            "LAST_ADMIN",
            "At least one active administrator must remain.",
        )


def find_user(db: Session, user_id: str) -> User:
    try:
        parsed = uuid.UUID(user_id)
    except ValueError as exc:
        raise AppError(404, "NOT_FOUND", "The account was not found.") from exc
    user = db.get(User, parsed)
    if user is None:
        raise AppError(404, "NOT_FOUND", "The account was not found.")
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise AppError(401, "CREDENTIALS", CREDENTIALS)
    return user


def change_password(db: Session, user: User, current: str, new_password: str) -> None:
    if not verify_password(current, user.password_hash):
        raise AppError(
            422,
            "VALIDATION",
            "The current password is incorrect.",
            [{"field": "current", "message": "The current password is incorrect."}],
        )
    validate_password(new_password)
    user.password_hash = hash_password(new_password)
    user.token_version += 1
    db.commit()


def reset_with_token(db: Session, token: str, new_password: str) -> None:
    row = db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == token_hash(token))
        .with_for_update()
    )
    now = datetime.now(UTC)
    if row is None or row.used_at is not None or row.expires_at <= now:
        raise AppError(400, "TOKEN", "The reset link is invalid, expired, or already used.")
    validate_password(new_password)
    user = db.get(User, row.user_id)
    if user is None:
        raise AppError(400, "TOKEN", "The reset link is invalid, expired, or already used.")
    row.used_at = now
    user.password_hash = hash_password(new_password)
    user.token_version += 1
    db.commit()


def issue_reset_token(db: Session, actor: User, user_id: str) -> str:
    if str(actor.id) == user_id:
        raise AppError(409, "SELF_RESET", "Use Change Password for your own account.")
    user = find_user(db, user_id)
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash(token),
            expires_at=datetime.now(UTC) + timedelta(minutes=15),
        )
    )
    db.commit()
    return token


def create_user(db: Session, name: str, email: str, password: str, role: str) -> User:
    validate_password(password)
    user = User(
        name=clean_name(name),
        email=clean_email(email, db),
        password_hash=hash_password(password),
        role_code=require_role(role),
        is_active=True,
        token_version=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def edit_user(db: Session, user_id: str, name: str, email: str) -> User:
    user = find_user(db, user_id)
    user.name = clean_name(name)
    user.email = clean_email(email, db, user.id)
    db.commit()
    db.refresh(user)
    return user


def set_status(db: Session, actor: User, user_id: str, active: bool) -> User:
    if str(actor.id) == user_id and not active:
        raise AppError(409, "SELF_DISABLE", "You cannot disable your own account.")
    admins = lock_active_admins(db)
    user = find_user(db, user_id)
    protect_last_admin(admins, user, removing=not active)
    user.is_active = active
    if not active:
        user.token_version += 1
    db.commit()
    db.refresh(user)
    return user


def set_role(db: Session, user_id: str, role: str) -> User:
    role = require_role(role)
    admins = lock_active_admins(db)
    user = find_user(db, user_id)
    protect_last_admin(admins, user, removing=role != "ADMIN")
    user.role_code = role
    db.commit()
    db.refresh(user)
    return user


def admin_reset_password(db: Session, actor: User, user_id: str, password: str | None) -> str | None:
    if str(actor.id) == user_id:
        raise AppError(409, "SELF_RESET", "Use Change Password for your own account.")
    user = find_user(db, user_id)
    generated = None
    if password is None or not password.strip():
        generated = secrets.token_urlsafe(9)
        password = generated
    validate_password(password)
    user.password_hash = hash_password(password)
    user.token_version += 1
    db.commit()
    return generated
