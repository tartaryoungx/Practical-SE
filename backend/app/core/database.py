"""Synchronous SQLAlchemy engine and session.

The engine connects on first use. Alembic owns schema creation.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.settings import get_settings


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(autoflush=False)
_engine: Engine | None = None


def create_db_engine(url: str) -> Engine:
    return create_engine(url, pool_pre_ping=True)


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_db_engine(get_settings().database_url)
        SessionLocal.configure(bind=_engine)
    return _engine


def get_db() -> Generator[Session, None, None]:
    get_engine()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
