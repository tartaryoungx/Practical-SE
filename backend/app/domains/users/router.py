"""Account administration routes."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.security import require_csrf
from app.domains.users.models import User
from app.domains.users.service import (
    admin_reset_password,
    create_user,
    edit_user,
    issue_reset_token,
    set_role,
    set_status,
    user_out,
)

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    email: str
    password: str
    role: str


class UserEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    email: str


class StatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_active: bool


class RoleIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str


class AdminResetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: str | None = None


@router.get("/me")
def read_me(user: User = Depends(get_current_user)) -> dict:
    return user_out(user)


@router.get("")
def list_users(
    _: User = Depends(require_permission("users.read")),
    db: Session = Depends(get_db),
) -> list[dict]:
    users = db.scalars(select(User).order_by(User.created_at, User.email)).all()
    return [user_out(user) for user in users]


@router.post("", status_code=201)
def add_user(
    body: UserCreate,
    _: None = Depends(require_csrf),
    __: User = Depends(require_permission("users.create")),
    db: Session = Depends(get_db),
) -> dict:
    return user_out(create_user(db, body.name, body.email, body.password, body.role))


@router.patch("/{user_id}")
def update_user(
    user_id: str,
    body: UserEdit,
    _: None = Depends(require_csrf),
    __: User = Depends(require_permission("users.edit")),
    db: Session = Depends(get_db),
) -> dict:
    return user_out(edit_user(db, user_id, body.name, body.email))


@router.patch("/{user_id}/status")
def update_status(
    user_id: str,
    body: StatusIn,
    _: None = Depends(require_csrf),
    actor: User = Depends(require_permission("users.status")),
    db: Session = Depends(get_db),
) -> dict:
    return user_out(set_status(db, actor, user_id, body.is_active))


@router.patch("/{user_id}/role")
def update_role(
    user_id: str,
    body: RoleIn,
    _: None = Depends(require_csrf),
    __: User = Depends(require_permission("users.role")),
    db: Session = Depends(get_db),
) -> dict:
    return user_out(set_role(db, user_id, body.role))


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: str,
    body: AdminResetIn,
    _: None = Depends(require_csrf),
    actor: User = Depends(require_permission("users.reset")),
    db: Session = Depends(get_db),
) -> dict:
    temporary = admin_reset_password(db, actor, user_id, body.password)
    return {"temporary_password": temporary}


@router.post("/{user_id}/reset-link")
def reset_link(
    user_id: str,
    _: None = Depends(require_csrf),
    actor: User = Depends(require_permission("users.reset")),
    db: Session = Depends(get_db),
) -> dict:
    return {"token": issue_reset_token(db, actor, user_id)}
