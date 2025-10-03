from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, conint, confloat
from ..schemas.shared import PageMeta  # optional; remove if not using a shared pagination schema
from ..models.billing import InvoiceStatus, PaymentMethod

# ---- Items ----
class InvoiceItemBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    qty: int = Field(..., ge=1)
    rate: float = Field(..., ge=0)

class InvoiceItemCreate(InvoiceItemBase): ...
class InvoiceItemUpdate(BaseModel):
    description: Optional[str] = None
    qty: Optional[int] = None
    rate: Optional[float] = None

class InvoiceItemOut(InvoiceItemBase):
    id: UUID
    amount: float
    class Config:
        from_attributes = True

# ---- Payments ----
class PaymentCreate(BaseModel):
    amount: float = Field(..., ge=0.01)
    method: PaymentMethod = PaymentMethod.cash
    paid_at: date

class PaymentOut(BaseModel):
    id: UUID
    amount: float
    method: PaymentMethod
    paid_at: date
    created_at: datetime
    class Config:
        from_attributes = True

# ---- Invoices ----
class InvoiceBase(BaseModel):
    patient_id: UUID
    issue_date: date
    due_date: Optional[date] = None
    tax: Optional[float] = 0
    discount: Optional[float] = 0

class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate]

class InvoiceUpdate(BaseModel):
    patient_id: Optional[UUID] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    tax: Optional[float] = None
    discount: Optional[float] = None
    items: Optional[List[InvoiceItemCreate]] = None  # replace items list fully on update

class InvoiceOut(BaseModel):
    id: UUID
    number: str
    patient_id: UUID
    patient_name: Optional[str] = None

    issue_date: date
    due_date: Optional[date]

    subtotal: float
    tax: float
    discount: float
    total: float
    amount_paid: float
    status: InvoiceStatus

    items: List[InvoiceItemOut] = []
    payments: List[PaymentOut] = []

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Optional pagination wrapper (use if you want /invoices to return a page object)
class InvoicePage(BaseModel):
    items: List[InvoiceOut]
    total: int
    page: int
    page_size: int