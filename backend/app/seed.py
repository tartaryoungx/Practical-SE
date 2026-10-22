"""Insert roles, permission definitions, initial grants, and the bootstrap admin.

Running this again does not duplicate rows, reset passwords, or overwrite grants.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_engine
from app.core.security import hash_password, validate_password
from app.core.settings import get_settings
from app.domains.access_control.catalog import INITIAL_GRANTS, PERMISSIONS
from app.domains.access_control.models import ROLE_CODES, Permission, Role, RolePermission
from app.domains.users.models import User


def seed_roles(session: Session) -> None:
    present = set(session.scalars(select(Role.code)))
    for code in ROLE_CODES:
        if code not in present:
            session.add(Role(code=code))
    session.commit()


def seed_permissions(session: Session) -> None:
    present = set(session.scalars(select(Permission.key)))
    for item in PERMISSIONS:
        if item["key"] not in present:
            session.add(
                Permission(
                    key=item["key"],
                    group_name=item["group"],
                    label=item["label"],
                    reserved=item["reserved"],
                )
            )
    session.flush()
    existing_grants = session.scalar(select(func.count()).select_from(RolePermission)) or 0
    if existing_grants == 0:
        for role, keys in INITIAL_GRANTS.items():
            for key in keys:
                session.add(RolePermission(role_code=role, permission_key=key))
    session.commit()


def seed_admin(session: Session) -> None:
    settings = get_settings()
    email = settings.bootstrap_admin_email.strip().lower()
    if session.scalar(select(User).where(User.email == email)) is not None:
        return
    validate_password(settings.bootstrap_admin_password)
    name = settings.bootstrap_admin_name.strip()
    if not name or len(name) > 100:
        raise RuntimeError("Bootstrap admin name must be 1–100 characters.")
    session.add(
        User(
            name=name,
            email=email,
            password_hash=hash_password(settings.bootstrap_admin_password),
            role_code="ADMIN",
            is_active=True,
            token_version=0,
        )
    )
    session.commit()


def seed_all(session: Session) -> None:
    seed_roles(session)
    seed_permissions(session)
    seed_admin(session)


def main() -> None:
    get_engine()
    session = SessionLocal()
    try:
        seed_all(session)
    finally:
        session.close()


if __name__ == "__main__":
    main()
