"""Create permissions and role grants.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "permissions",
        sa.Column("key", sa.String(length=64), primary_key=True),
        sa.Column("group_name", sa.String(length=32), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("reserved", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "role_permissions",
        sa.Column("role_code", sa.String(length=32), sa.ForeignKey("roles.code"), primary_key=True),
        sa.Column(
            "permission_key",
            sa.String(length=64),
            sa.ForeignKey("permissions.key"),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("role_permissions")
    op.drop_table("permissions")
