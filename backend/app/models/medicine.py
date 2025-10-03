from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

def uuid_col(pk: bool = False):
    try:
        return mapped_column(PGUUID(as_uuid=True), primary_key=pk, default=uuid.uuid4)
    except Exception:
        return mapped_column(String, primary_key=pk, default=lambda: str(uuid.uuid4()))

class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[uuid.UUID] = uuid_col(pk=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    generic_name: Mapped[str] = mapped_column(String(255), nullable=True)  # Added missing field
    strength: Mapped[str] = mapped_column(String(100), nullable=True)
    dosage_form: Mapped[str] = mapped_column(String(50), nullable=True)
    manufacturer: Mapped[str] = mapped_column(String(255), nullable=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    price: Mapped[str] = mapped_column(String(20), nullable=False, default="0")  # Store as string

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)