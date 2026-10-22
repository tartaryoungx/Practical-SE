"""Story 000 foundation checks."""

from pathlib import Path

import pytest
from fastapi import FastAPI, Query
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.testclient import TestClient

from app.core.errors import register_error_handlers
from app.core.settings import Settings
from app.domains.access_control.models import ROLE_CHECK_SQL, ROLE_CODES

BACKEND_DIR = Path(__file__).resolve().parents[1]
MIGRATION = BACKEND_DIR / "alembic" / "versions" / "0001_create_roles.py"


def test_migration_constraint_matches_the_role_model() -> None:
    assert MIGRATION.read_text(encoding="utf-8").count(ROLE_CHECK_SQL) == 1
    assert ROLE_CODES == ("ADMIN", "STORE_STAFF", "CONTRACTOR", "HEAD")


def test_runtime_schema_creation_is_absent() -> None:
    for root in (BACKEND_DIR / "app", BACKEND_DIR / "alembic"):
        for path in root.rglob("*.py"):
            assert "create_all" not in path.read_text(encoding="utf-8")


def test_cors_origins_reject_a_wildcard() -> None:
    settings = Settings(
        database_url="postgresql+psycopg://garment_app:replace_me@localhost/garment_returns",
        cors_origins="http://localhost:3000",
    )
    assert settings.cors_origins == ["http://localhost:3000"]
    with pytest.raises(ValidationError):
        Settings(
            database_url="postgresql+psycopg://garment_app:replace_me@localhost/garment_returns",
            cors_origins="*",
        )


def test_validation_database_and_unexpected_errors_use_the_shared_envelope() -> None:
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/echo")
    def echo(amount: int = Query(...)) -> dict[str, int]:
        return {"amount": amount}

    @app.get("/db")
    def db_failure() -> None:
        raise OperationalError("SELECT 1", {}, Exception("password=secret"))

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("secret traceback detail")

    client = TestClient(app, raise_server_exceptions=False)
    invalid = client.get("/echo?amount=abc")
    missing = client.get("/missing")
    database = client.get("/db")
    unexpected = client.get("/boom")

    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "VALIDATION"
    assert invalid.json()["error"]["details"][0]["field"] == "amount"
    assert "abc" not in invalid.text

    assert missing.status_code == 404
    assert missing.json() == {
        "error": {
            "code": "NOT_FOUND",
            "message": "The requested resource was not found.",
            "details": [],
        }
    }

    assert database.status_code == 503
    assert database.json()["error"]["code"] == "DATABASE_UNAVAILABLE"
    assert "secret" not in database.text

    assert unexpected.status_code == 500
    assert unexpected.json()["error"]["code"] == "INTERNAL"
    assert "secret" not in unexpected.text
    assert "traceback" not in unexpected.text.lower()


def test_upgrade_creates_only_the_roles_table(db_session) -> None:
    names = set(
        db_session.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                """
            )
        ).scalars()
    )
    assert names == {
            "alembic_version",
            "evidence_files",
            "garments",
            "password_reset_tokens",
            "permissions",
            "role_permissions",
            "roles",
            "users",
        }


def test_seed_is_idempotent(db_session) -> None:
    from app.seed import seed_roles

    seed_roles(db_session)
    seed_roles(db_session)
    codes = db_session.execute(text("SELECT code FROM roles ORDER BY code")).scalars().all()
    assert codes == ["ADMIN", "CONTRACTOR", "HEAD", "STORE_STAFF"]
    assert set(codes) == set(ROLE_CODES)


def test_invalid_role_code_is_rejected(db_session) -> None:
    with pytest.raises(IntegrityError):
        db_session.execute(text("INSERT INTO roles (code) VALUES ('OTHER')"))
        db_session.commit()
    db_session.rollback()


def test_health_checks_the_database(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_failure_uses_the_shared_envelope(client, monkeypatch) -> None:
    from sqlalchemy.orm import Session

    def fail(*_args, **_kwargs):
        raise OperationalError("SELECT 1", {}, Exception("password=secret"))

    monkeypatch.setattr(Session, "execute", fail)
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "DATABASE_UNAVAILABLE"
    assert "secret" not in response.text


def test_cors_allows_the_frontend_origin_with_credentials(client) -> None:
    origin = "http://localhost:3000"
    preflight = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    response = client.get("/health", headers={"Origin": origin})
    denied = client.get("/missing", headers={"Origin": "http://evil.example"})

    assert preflight.headers["access-control-allow-origin"] == origin
    assert preflight.headers["access-control-allow-credentials"] == "true"
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-credentials"] == "true"
    assert denied.status_code == 404
    assert denied.json()["error"]["code"] == "NOT_FOUND"
    assert "access-control-allow-origin" not in denied.headers
    assert response.headers["access-control-allow-origin"] == origin
