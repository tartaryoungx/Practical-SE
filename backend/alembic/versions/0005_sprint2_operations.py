"""Add stores, batches, outcomes, validation, data issues, and draft reports.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-12

Existing garment rows keep a null store. They are not assigned to a store.

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stores",
        sa.Column("code", sa.String(length=32), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
    )
    op.add_column("garments", sa.Column("store_code", sa.String(length=32), nullable=True))
    op.create_foreign_key("fk_garments_store", "garments", "stores", ["store_code"], ["code"])
    op.create_index("ix_garments_store", "garments", ["store_code"])
    op.execute(sa.text("CREATE SEQUENCE batch_seq"))
    op.create_table(
        "batches",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("store_code", sa.String(length=32), sa.ForeignKey("stores.code"), nullable=False),
        sa.Column("contractor_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DRAFT"),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_weight_kg", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("planned_pickup_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("picked_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "status IN ('DRAFT', 'READY_FOR_PICKUP', 'PICKED_UP', 'RECEIVED')",
            name="ck_batches_status",
        ),
        sa.CheckConstraint("quantity >= 0", name="ck_batches_quantity"),
        sa.CheckConstraint("total_weight_kg >= 0", name="ck_batches_weight"),
    )
    op.create_index("ix_batches_status", "batches", ["status"])
    op.create_index("ix_batches_store", "batches", ["store_code"])
    op.create_index("ix_batches_contractor", "batches", ["contractor_id"])
    op.create_index("ix_batches_planned", "batches", ["planned_pickup_at"])
    op.create_table(
        "batch_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("batch_id", sa.String(length=32), sa.ForeignKey("batches.id"), nullable=False),
        sa.Column("garment_id", sa.String(length=32), sa.ForeignKey("garments.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.UniqueConstraint("garment_id", name="uq_batch_items_garment"),
    )
    op.create_index("ix_batch_items_batch", "batch_items", ["batch_id"])
    op.create_table(
        "sorting_results",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("batch_id", sa.String(length=32), sa.ForeignKey("batches.id"), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="DRAFT"),
        sa.Column("resale_kg", sa.Numeric(12, 3), nullable=False),
        sa.Column("fibre_to_fibre_kg", sa.Numeric(12, 3), nullable=False),
        sa.Column("downcycling_kg", sa.Numeric(12, 3), nullable=False),
        sa.Column("unknown_kg", sa.Numeric(12, 3), nullable=False),
        sa.Column("total_kg", sa.Numeric(12, 3), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("submitted_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('DRAFT', 'SUBMITTED')", name="ck_sorting_status"),
        sa.CheckConstraint("resale_kg >= 0", name="ck_sorting_resale"),
        sa.CheckConstraint("fibre_to_fibre_kg >= 0", name="ck_sorting_fibre"),
        sa.CheckConstraint("downcycling_kg >= 0", name="ck_sorting_downcycling"),
        sa.CheckConstraint("unknown_kg >= 0", name="ck_sorting_unknown"),
        sa.CheckConstraint("total_kg >= 0", name="ck_sorting_total"),
        sa.UniqueConstraint("batch_id", name="uq_sorting_batch"),
    )
    op.create_table(
        "final_outcomes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("batch_id", sa.String(length=32), sa.ForeignKey("batches.id"), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="DRAFT"),
        sa.Column("total_kg", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("submitted_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('DRAFT', 'SUBMITTED')", name="ck_outcomes_status"),
        sa.CheckConstraint("total_kg >= 0", name="ck_outcomes_total"),
        sa.UniqueConstraint("batch_id", name="uq_outcomes_batch"),
    )
    op.create_table(
        "final_outcome_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("outcome_id", sa.Uuid(), sa.ForeignKey("final_outcomes.id"), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("weight_kg", sa.Numeric(12, 3), nullable=False),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.CheckConstraint(
            "category IN ('RESOLD', 'FIBRE_TO_FIBRE', 'DOWNCYCLED', 'DISCARDED', 'UNKNOWN')",
            name="ck_outcome_items_category",
        ),
        sa.CheckConstraint("weight_kg > 0", name="ck_outcome_items_weight"),
    )
    op.create_table(
        "outcome_evidence",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("outcome_id", sa.Uuid(), sa.ForeignKey("final_outcomes.id"), nullable=False),
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
    op.create_table(
        "batch_validations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("batch_id", sa.String(length=32), sa.ForeignKey("batches.id"), nullable=False),
        sa.Column("decision", sa.String(length=16), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("decided_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("decision IN ('VALID', 'FLAGGED')", name="ck_validations_decision"),
        sa.CheckConstraint(
            "decision <> 'FLAGGED' OR length(btrim(reason)) > 0",
            name="ck_validations_reason",
        ),
        sa.UniqueConstraint("batch_id", name="uq_validations_batch"),
    )
    op.execute(sa.text("CREATE SEQUENCE issue_seq"))
    op.create_table(
        "data_issues",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("batch_id", sa.String(length=32), sa.ForeignKey("batches.id"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("assignee_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="OPEN"),
        sa.Column("requested_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("response_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "status IN ('OPEN', 'RESPONDED', 'RESOLVED', 'REOPENED')",
            name="ck_issues_status",
        ),
    )
    op.create_index("ix_issues_assignee", "data_issues", ["assignee_id"])
    op.create_index("ix_issues_batch", "data_issues", ["batch_id"])
    op.execute(sa.text("CREATE SEQUENCE report_seq"))
    op.create_table(
        "report_configurations",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("store_code", sa.String(length=32), sa.ForeignKey("stores.code"), nullable=True),
        sa.Column("contractor_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="DRAFT"),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("status = 'DRAFT'", name="ck_reports_draft"),
        sa.CheckConstraint("period_end >= period_start", name="ck_reports_period"),
    )


def downgrade() -> None:
    op.drop_table("report_configurations")
    op.execute(sa.text("DROP SEQUENCE report_seq"))
    op.drop_index("ix_issues_batch", table_name="data_issues")
    op.drop_index("ix_issues_assignee", table_name="data_issues")
    op.drop_table("data_issues")
    op.execute(sa.text("DROP SEQUENCE issue_seq"))
    op.drop_table("batch_validations")
    op.drop_table("outcome_evidence")
    op.drop_table("final_outcome_items")
    op.drop_table("final_outcomes")
    op.drop_table("sorting_results")
    op.drop_index("ix_batch_items_batch", table_name="batch_items")
    op.drop_table("batch_items")
    op.drop_index("ix_batches_planned", table_name="batches")
    op.drop_index("ix_batches_contractor", table_name="batches")
    op.drop_index("ix_batches_store", table_name="batches")
    op.drop_index("ix_batches_status", table_name="batches")
    op.drop_table("batches")
    op.execute(sa.text("DROP SEQUENCE batch_seq"))
    op.drop_index("ix_garments_store", table_name="garments")
    op.drop_constraint("fk_garments_store", "garments", type_="foreignkey")
    op.drop_column("garments", "store_code")
    op.drop_table("stores")
