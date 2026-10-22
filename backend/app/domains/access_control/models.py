"""Fixed roles and permission grants."""

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

ROLE_CODES = ("ADMIN", "STORE_STAFF", "CONTRACTOR", "HEAD")
ROLE_CHECK_SQL = "code IN ({})".format(", ".join(f"'{code}'" for code in ROLE_CODES))


class Role(Base):
    __tablename__ = "roles"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)

    __table_args__ = (CheckConstraint(ROLE_CHECK_SQL, name="ck_roles_code"),)


class Permission(Base):
    __tablename__ = "permissions"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    group_name: Mapped[str] = mapped_column(String(32))
    label: Mapped[str] = mapped_column(String(120))
    reserved: Mapped[bool] = mapped_column(Boolean, default=False)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_code: Mapped[str] = mapped_column(ForeignKey("roles.code"), primary_key=True)
    permission_key: Mapped[str] = mapped_column(ForeignKey("permissions.key"), primary_key=True)
