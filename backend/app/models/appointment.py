from __future__ import annotations
import uuid
from datetime import datetime, date, time
from sqlalchemy import String, Date, Time, DateTime, Boolean, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

def uuid_col(pk: bool = False):
    try:
        return mapped_column(PGUUID(as_uuid=True), primary_key=pk, default=uuid.uuid4)
    except Exception:
        return mapped_column(String, primary_key=pk, default=lambda: str(uuid.uuid4()))

class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = uuid_col(pk=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)

    # clinical notes that you want visible in Excel/Billing
    issue: Mapped[str | None] = mapped_column(String(255), nullable=True)     # chief complaint / primary issue
    diagnosis: Mapped[str | None] = mapped_column(String(255), nullable=True) # diagnosis/assessment
    notes: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # scheduling
    appt_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    appt_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    patient = relationship("Patient")