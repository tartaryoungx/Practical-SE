"""Story 000 fixtures. Temporary databases are created here and dropped afterward."""

import os
import sys
import uuid
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.pool import NullPool

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture(scope="session")
def client():
    base_url = os.environ.get("TEST_DATABASE_URL", "").strip()
    if not base_url:
        pytest.skip("TEST_DATABASE_URL is not set")

    admin_url = make_url(base_url).set(database="postgres")
    temp_name = f"gr_test_{uuid.uuid4().hex[:16]}"
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", poolclass=NullPool)
    try:
        with admin_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        admin_engine.dispose()
        pytest.skip("PostgreSQL is not available for Story 000 tests")

    created = False
    try:
        with admin_engine.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{temp_name}"'))
        created = True
        os.environ["DATABASE_URL"] = make_url(base_url).set(database=temp_name).render_as_string(
            hide_password=False
        )
        from app.core.settings import get_settings

        get_settings.cache_clear()

        from alembic import command
        from alembic.config import Config

        command.upgrade(Config(str(BACKEND_DIR / "alembic.ini")), "head")

        from starlette.testclient import TestClient

        from app.main import app

        with TestClient(app) as test_client:
            yield test_client
    finally:
        if created:
            try:
                from app.core.database import get_engine

                get_engine().dispose()
            except Exception:
                pass
            with admin_engine.connect() as connection:
                connection.execute(text(f'DROP DATABASE IF EXISTS "{temp_name}" WITH (FORCE)'))
        admin_engine.dispose()


@pytest.fixture
def db_session(client):
    from app.core.database import SessionLocal, get_engine

    get_engine()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
