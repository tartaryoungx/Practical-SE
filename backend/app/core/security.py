"""Password hashing, JWT cookies, and CSRF checks."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Request
from starlette.responses import Response

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.users.models import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def validate_password(password: str, field: str = "password") -> None:
    if len(password) < 8 or len(password) > 128:
        raise AppError(
            422,
            "VALIDATION",
            "Password must be 8–128 characters.",
            [{"field": field, "message": "Use 8–128 characters."}],
        )


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_secret() -> str:
    return secrets.token_urlsafe(32)


def encode_access_token(user: User) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user.id),
        "ver": user.token_version,
        "exp": datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        raise AppError(401, "UNAUTHENTICATED", "Authentication is required.") from exc


def set_auth_cookies(response: Response, user: User) -> str:
    settings = get_settings()
    max_age = settings.jwt_expire_minutes * 60
    csrf = new_secret()
    response.set_cookie(
        settings.cookie_name,
        encode_access_token(user),
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=max_age,
        path="/",
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=max_age,
        path="/",
    )
    return csrf


def clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(settings.cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


def require_csrf(request: Request) -> None:
    settings = get_settings()
    cookie = request.cookies.get(settings.csrf_cookie_name, "")
    header = request.headers.get("x-csrf-token", "")
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise AppError(403, "CSRF", "The request could not be verified.")
