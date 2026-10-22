"""Insert the four fixed roles. Safe to run more than once."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_engine
from app.domains.access_control.models import ROLE_CODES, Role


def seed_roles(session: Session) -> None:
    present = set(session.scalars(select(Role.code)))
    for code in ROLE_CODES:
        if code not in present:
            session.add(Role(code=code))
    session.commit()


def main() -> None:
    get_engine()
    session = SessionLocal()
    try:
        seed_roles(session)
    finally:
        session.close()


if __name__ == "__main__":
    main()
