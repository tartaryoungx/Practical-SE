"""Persistence for Sprint 2 batch operations.

Store rows are reference data. Garments without a store stay unassigned.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

STORES = (
    ("central", "Central store"),
    ("north", "North store"),
    ("east", "East store"),
)
BATCH_STATUSES = ("DRAFT", "READY_FOR_PICKUP", "PICKED_UP", "RECEIVED")
RECORD_STATUSES = ("DRAFT", "SUBMITTED")
OUTCOME_CATEGORIES = ("RESOLD", "FIBRE_TO_FIBRE", "DOWNCYCLED", "DISCARDED", "UNKNOWN")
ISSUE_STATUSES = ("OPEN", "RESPONDED", "RESOLVED", "REOPENED")
VALIDATION_DECISIONS = ("VALID", "FLAGGED")


class Store(Base):
    __tablename__ = "stores"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    store_code: Mapped[str] = mapped_column(ForeignKey("stores.code"))
    contractor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    total_weight_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    planned_pickup_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'READY_FOR_PICKUP', 'PICKED_UP', 'RECEIVED')",
            name="ck_batches_status",
        ),
        CheckConstraint("quantity >= 0", name="ck_batches_quantity"),
        CheckConstraint("total_weight_kg >= 0", name="ck_batches_weight"),
    )


class BatchItem(Base):
    __tablename__ = "batch_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[str] = mapped_column(ForeignKey("batches.id"))
    garment_id: Mapped[str] = mapped_column(ForeignKey("garments.id"), unique=True)
    position: Mapped[int] = mapped_column(Integer)


class SortingResult(Base):
    __tablename__ = "sorting_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[str] = mapped_column(ForeignKey("batches.id"), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="DRAFT")
    resale_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    fibre_to_fibre_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    downcycling_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    unknown_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    total_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'SUBMITTED')", name="ck_sorting_status"),
        CheckConstraint("resale_kg >= 0", name="ck_sorting_resale"),
        CheckConstraint("fibre_to_fibre_kg >= 0", name="ck_sorting_fibre"),
        CheckConstraint("downcycling_kg >= 0", name="ck_sorting_downcycling"),
        CheckConstraint("unknown_kg >= 0", name="ck_sorting_unknown"),
        CheckConstraint("total_kg >= 0", name="ck_sorting_total"),
    )


class FinalOutcome(Base):
    __tablename__ = "final_outcomes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[str] = mapped_column(ForeignKey("batches.id"), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="DRAFT")
    total_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'SUBMITTED')", name="ck_outcomes_status"),
        CheckConstraint("total_kg >= 0", name="ck_outcomes_total"),
    )


class FinalOutcomeItem(Base):
    __tablename__ = "final_outcome_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    outcome_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("final_outcomes.id"))
    category: Mapped[str] = mapped_column(String(32))
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    note: Mapped[str] = mapped_column(Text, default="")

    __table_args__ = (
        CheckConstraint(
            "category IN ('RESOLD', 'FIBRE_TO_FIBRE', 'DOWNCYCLED', 'DISCARDED', 'UNKNOWN')",
            name="ck_outcome_items_category",
        ),
        CheckConstraint("weight_kg > 0", name="ck_outcome_items_weight"),
    )


class OutcomeEvidence(Base):
    __tablename__ = "outcome_evidence"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    outcome_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("final_outcomes.id"))
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int] = mapped_column(Integer)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BatchValidation(Base):
    __tablename__ = "batch_validations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[str] = mapped_column(ForeignKey("batches.id"), unique=True)
    decision: Mapped[str] = mapped_column(String(16))
    reason: Mapped[str] = mapped_column(Text, default="")
    decided_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("decision IN ('VALID', 'FLAGGED')", name="ck_validations_decision"),
        CheckConstraint(
            "decision <> 'FLAGGED' OR length(btrim(reason)) > 0",
            name="ck_validations_reason",
        ),
    )


class DataIssue(Base):
    __tablename__ = "data_issues"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("batches.id"))
    message: Mapped[str] = mapped_column(Text)
    assignee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(16), default="OPEN")
    requested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    response_text: Mapped[str] = mapped_column(Text, default="")
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_note: Mapped[str] = mapped_column(Text, default="")
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN', 'RESPONDED', 'RESOLVED', 'REOPENED')",
            name="ck_issues_status",
        ),
    )


class ReportConfiguration(Base):
    __tablename__ = "report_configurations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    store_code: Mapped[str | None] = mapped_column(ForeignKey("stores.code"), nullable=True)
    contractor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="DRAFT")
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("status = 'DRAFT'", name="ck_reports_draft"),
        CheckConstraint("period_end >= period_start", name="ck_reports_period"),
    )
