"""Authentication routes."""

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import clear_auth_cookies, require_csrf, set_auth_cookies
from app.domains.users.models import User
from app.domains.users.service import authenticate, change_password, reset_with_token, session_out

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str
    password: str


class ChangePasswordIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current: str
    password: str


class ResetPasswordIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str
    password: str


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)) -> JSONResponse:
    user = authenticate(db, body.email, body.password)
    response = JSONResponse(session_out(db, user))
    set_auth_cookies(response, user)
    return response


@router.post("/logout", status_code=204)
def logout(
    _: None = Depends(require_csrf),
    __: User = Depends(get_current_user),
) -> Response:
    response = Response(status_code=204)
    clear_auth_cookies(response)
    return response


@router.get("/session")
def read_session(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return session_out(db, user)


@router.post("/change-password", status_code=204)
def update_password(
    body: ChangePasswordIn,
    _: None = Depends(require_csrf),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    change_password(db, user, body.current, body.password)
    response = Response(status_code=204)
    clear_auth_cookies(response)
    return response


@router.post("/reset-password", status_code=204)
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)) -> None:
    reset_with_token(db, body.token, body.password)
