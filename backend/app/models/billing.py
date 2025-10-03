from __future__ import annotations
import enum
import uuid
from datetime import datetime, date
from typing import List, Optional

from sqlalchemy import (
    Column, String, Date, DateTime, Boolean, Integer, Enum, func, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from ..models.base import Base

def uuid_col(pk: bool = False):
    try:
        return mapped_column(PGUUID(as_uuid=True), primary_key=pk, default=uuid.uuid4)
    except Exception:
        return mapped_column(String, primary_key=pk, default=lambda: str(uuid.uuid4()))

class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"
    void = "void"

class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    upi = "upi"
    bank = "bank"

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = uuid_col(pk=True)
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    rate: Mapped[str] = mapped_column(String(20), nullable=False, default="0")  # Store as string

    invoice: Mapped["Invoice"] = relationship(back_populates="items")

    @property
    def amount(self) -> float:
        return float(self.qty) * float(self.rate or 0)

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = uuid_col(pk=True)
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    amount: Mapped[str] = mapped_column(String(20), nullable=False, default="0")  # Store as string
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.cash)
    paid_at: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    invoice: Mapped["Invoice"] = relationship(back_populates="payments")

class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = uuid_col(pk=True)
    number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    subtotal: Mapped[str] = mapped_column(String(20), nullable=False, default="0")
    tax: Mapped[str] = mapped_column(String(20), nullable=False, default="0")
    discount: Mapped[str] = mapped_column(String(20), nullable=False, default="0")
    total: Mapped[str] = mapped_column(String(20), nullable=False, default="0")
    amount_paid: Mapped[str] = mapped_column(String(20), nullable=False, default="0")

    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.draft)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Proper relationships with foreign keys
    patient: Mapped["Patient"] = relationship("Patient", back_populates="invoices")
    items: Mapped[List[InvoiceItem]] = relationship("InvoiceItem", cascade="all, delete-orphan", back_populates="invoice")
    payments: Mapped[List[Payment]] = relationship("Payment", cascade="all, delete-orphan", back_populates="invoice")

    # ---- helpers ----
    def recompute_totals(self):
        self.subtotal = str(sum(item.amount for item in self.items) if self.items else 0)
        total_val = max(0, float(self.subtotal) + float(self.tax or 0) - float(self.discount or 0))
        self.total = str(total_val)
        paid = sum(float(p.amount or 0) for p in self.payments) if self.payments else float(self.amount_paid or 0)
        self.amount_paid = str(paid)
        
        if self.status == InvoiceStatus.void:
            return
        if total_val <= 0:
            self.status = InvoiceStatus.paid
        elif paid <= 0:
            self.status = InvoiceStatus.unpaid
        elif paid < total_val:
            self.status = InvoiceStatus.partial
        else:
            self.status = InvoiceStatus.paid