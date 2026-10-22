"""Create garments, evidence metadata, and the garment id sequence.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("CREATE SEQUENCE garment_seq"))
    op.create_table(
        "garments",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("type", sa.String(length=200), nullable=False),
        sa.Column("material", sa.String(length=200), nullable=False),
        sa.Column("weight_kg", sa.Numeric(10, 3), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("condition", sa.String(length=16), nullable=True),
        sa.Column("recommendation", sa.String(length=32), nullable=True),
        sa.Column("confirmed_route", sa.String(length=32), nullable=True),
        sa.Column("override_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("weight_kg > 0", name="ck_garments_weight"),
        sa.CheckConstraint(
            "condition IS NULL OR condition IN ('GOOD', 'WORN', 'DAMAGED', 'STAINED')",
            name="ck_garments_condition",
        ),
        sa.CheckConstraint(
            "recommendation IS NULL OR recommendation IN "
            "('DIRECT_RESALE_CANDIDATE', 'THIRD_PARTY_CONTRACTOR')",
            name="ck_garments_recommendation",
        ),
        sa.CheckConstraint(
            "confirmed_route IS NULL OR confirmed_route IN "
            "('DIRECT_RESALE_CANDIDATE', 'THIRD_PARTY_CONTRACTOR')",
            name="ck_garments_confirmed_route",
        ),
    )
    op.create_table(
        "evidence_files",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("garment_id", sa.String(length=32), sa.ForeignKey("garments.id"), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_name", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("evidence_files")
    op.drop_table("garments")
    op.execute(sa.text("DROP SEQUENCE garment_seq"))
