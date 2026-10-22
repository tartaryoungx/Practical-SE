"""Fixed Sprint 1 roles."""

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

ROLE_CODES = ("ADMIN", "STORE_STAFF", "CONTRACTOR", "HEAD")
ROLE_CHECK_SQL = "code IN ({})".format(", ".join(f"'{code}'" for code in ROLE_CODES))


class Role(Base):
    __tablename__ = "roles"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)

    __table_args__ = (CheckConstraint(ROLE_CHECK_SQL, name="ck_roles_code"),)
