"""Returned garments and evidence metadata."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

CONDITIONS = ("GOOD", "WORN", "DAMAGED", "STAINED")
ROUTES = ("DIRECT_RESALE_CANDIDATE", "THIRD_PARTY_CONTRACTOR")


class Garment(Base):
    __tablename__ = "garments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    type: Mapped[str] = mapped_column(String(200))
    material: Mapped[str] = mapped_column(String(200))
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(10, 3))
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    condition: Mapped[str | None] = mapped_column(String(16), nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(32), nullable=True)
    confirmed_route: Mapped[str | None] = mapped_column(String(32), nullable=True)
    override_note: Mapped[str] = mapped_column(Text, default="")
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("weight_kg > 0", name="ck_garments_weight"),
        CheckConstraint(
            "condition IS NULL OR condition IN ('GOOD', 'WORN', 'DAMAGED', 'STAINED')",
            name="ck_garments_condition",
        ),
        CheckConstraint(
            "recommendation IS NULL OR recommendation IN "
            "('DIRECT_RESALE_CANDIDATE', 'THIRD_PARTY_CONTRACTOR')",
            name="ck_garments_recommendation",
        ),
        CheckConstraint(
            "confirmed_route IS NULL OR confirmed_route IN "
            "('DIRECT_RESALE_CANDIDATE', 'THIRD_PARTY_CONTRACTOR')",
            name="ck_garments_confirmed_route",
        ),
    )


class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    garment_id: Mapped[str] = mapped_column(ForeignKey("garments.id"))
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int] = mapped_column(Integer)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
