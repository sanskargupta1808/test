from __future__ import annotations
import uuid
from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, Boolean, func, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

def uuid_col(pk: bool = False):
    try:
        return mapped_column(PGUUID(as_uuid=True), primary_key=pk, default=uuid.uuid4)
    except Exception:
        return mapped_column(String, primary_key=pk, default=lambda: str(uuid.uuid4()))

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = uuid_col(pk=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=True)
    gender: Mapped[str] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[str] = mapped_column(String(10), nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=True)
    allergies: Mapped[str] = mapped_column(String(255), nullable=True)
    medical_history: Mapped[str] = mapped_column(String(255), nullable=True)
    emergency_contact: Mapped[str] = mapped_column(String(255), nullable=True)
    notes: Mapped[str] = mapped_column(String(255), nullable=True)
    medical_images: Mapped[str] = mapped_column(Text, nullable=True)  # Store JSON string of file data

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Proper relationship with back_populates
    invoices = relationship("Invoice", back_populates="patient")