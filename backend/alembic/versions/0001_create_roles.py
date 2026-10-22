"""Create the fixed roles table.

Revision ID: 0001
Revises:
Create Date: 2026-10-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ROLE_CHECK_SQL = "code IN ('ADMIN', 'STORE_STAFF', 'CONTRACTOR', 'HEAD')"


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("code", sa.String(length=32), primary_key=True),
        sa.CheckConstraint(ROLE_CHECK_SQL, name="ck_roles_code"),
    )


def downgrade() -> None:
    op.drop_table("roles")
