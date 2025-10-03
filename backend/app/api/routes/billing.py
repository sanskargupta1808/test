from __future__ import annotations
from datetime import date
import uuid
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func

from ...core.deps import get_db, get_current_user  # adjust import path if needed
from ...models.user import User                     # optional auth
from ...models.billing import Invoice, InvoiceItem, Payment, InvoiceStatus, PaymentMethod
from ...models.patient import Patient
from ...schemas.billing import (
    InvoiceCreate, InvoiceUpdate, InvoiceOut, PaymentCreate, InvoicePage
)

router = APIRouter(prefix="/invoices", tags=["billing"])

# --- helpers ---
def gen_invoice_number(db: Session) -> str:
    # Simple sequential per month: INV-YYYYMM-#### ; robust enough for clinics
    yyyymm = date.today().strftime("%Y%m")
    prefix = f"INV-{yyyymm}-"
    last = db.query(Invoice).filter(Invoice.number.like(f"{prefix}%")).order_by(Invoice.number.desc()).first()
    last_num = int(last.number.split("-")[-1]) if last else 0
    return f"{prefix}{last_num + 1:04d}"

def apply_filters(qs, q: Optional[str], status: Optional[InvoiceStatus], date_from: Optional[date], date_to: Optional[date]):
    if q:
        qs = qs.join(Patient, Patient.id == Invoice.patient_id).filter(
            or_(
                func.lower(Invoice.number).like(f"%{q.lower()}%"),
                func.lower(Patient.name).like(f"%{q.lower()}%")
            )
        )
    if status:
        qs = qs.filter(Invoice.status == status)
    if date_from:
        qs = qs.filter(Invoice.issue_date >= date_from)
    if date_to:
        qs = qs.filter(Invoice.issue_date <= date_to)
    qs = qs.filter(Invoice.is_deleted == False)
    return qs

# --- list ---
@router.get("", response_model=InvoicePage)
def list_invoices(
    response: Response,
    q: Optional[str] = Query(None, description="Search by invoice number or patient name"),
    status: Optional[InvoiceStatus] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sort_by: Literal["issue_date","total","number","status"] = "issue_date",
    sort_dir: Literal["asc","desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    qs = db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.payments),
        joinedload(Invoice.patient)
    )
    qs = apply_filters(qs, q, status, date_from, date_to)

    total = qs.count()

    sort_col = {
        "issue_date": Invoice.issue_date,
        "total": Invoice.total,
        "number": Invoice.number,
        "status": Invoice.status,
    }[sort_by]
    qs = qs.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    items = qs.offset((page-1)*page_size).limit(page_size).all()

    out: List[InvoiceOut] = []
    for inv in items:
        inv.recompute_totals()  # ensure fresh totals/status (esp. after payments)
        out.append(InvoiceOut.model_validate({
            **{c.name: getattr(inv, c.name) for c in Invoice.__table__.columns},
            "patient_name": inv.patient.name if inv.patient else None,
            "items": [
                {
                    "id": it.id, "description": it.description, "qty": it.qty, "rate": float(it.rate), "amount": it.amount
                } for it in inv.items
            ],
            "payments": [
                {
                    "id": p.id, "amount": float(p.amount), "method": p.method, "paid_at": p.paid_at, "created_at": p.created_at
                } for p in inv.payments
            ],
        }, from_attributes=True))

    response.headers["X-Total-Count"] = str(total)
    return {"items": out, "total": total, "page": page, "page_size": page_size}

# --- create ---
@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    inv = Invoice(
        id=uuid.uuid4(),
        number=gen_invoice_number(db),
        patient_id=payload.patient_id,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        tax=payload.tax or 0,
        discount=payload.discount or 0,
        status=InvoiceStatus.unpaid if payload.items else InvoiceStatus.draft,
    )
    inv.items = [InvoiceItem(description=i.description, qty=i.qty, rate=i.rate) for i in payload.items]
    inv.recompute_totals()

    db.add(inv)
    db.commit()
    db.refresh(inv)

    return InvoiceOut.model_validate({
        **{c.name: getattr(inv, c.name) for c in Invoice.__table__.columns},
        "patient_name": patient.name,
        "items": [{"id": it.id, "description": it.description, "qty": it.qty, "rate": float(it.rate), "amount": it.amount} for it in inv.items],
        "payments": [],
    }, from_attributes=True)

# --- retrieve ---
@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    inv = db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.payments),
        joinedload(Invoice.patient),
    ).filter(Invoice.id == invoice_id, Invoice.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    inv.recompute_totals()
    return InvoiceOut.model_validate({
        **{c.name: getattr(inv, c.name) for c in Invoice.__table__.columns},
        "patient_name": inv.patient.name if inv.patient else None,
        "items": [{"id": it.id, "description": it.description, "qty": it.qty, "rate": float(it.rate), "amount": it.amount} for it in inv.items],
        "payments": [{"id": p.id, "amount": float(p.amount), "method": p.method, "paid_at": p.paid_at, "created_at": p.created_at} for p in inv.payments],
    }, from_attributes=True)

# --- update (replace items list if provided) ---
@router.patch("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: uuid.UUID,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    inv = db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.payments),
        joinedload(Invoice.patient),
    ).filter(Invoice.id == invoice_id, Invoice.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if payload.patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        inv.patient_id = payload.patient_id

    if payload.issue_date is not None:
        inv.issue_date = payload.issue_date
    if payload.due_date is not None:
        inv.due_date = payload.due_date
    if payload.tax is not None:
        inv.tax = payload.tax
    if payload.discount is not None:
        inv.discount = payload.discount

    if payload.items is not None:
        inv.items.clear()
        for it in payload.items:
            inv.items.append(InvoiceItem(description=it.description, qty=it.qty, rate=it.rate))

    inv.recompute_totals()
    db.commit()
    db.refresh(inv)

    return InvoiceOut.model_validate({
        **{c.name: getattr(inv, c.name) for c in Invoice.__table__.columns},
        "patient_name": inv.patient.name if inv.patient else None,
        "items": [{"id": it.id, "description": it.description, "qty": it.qty, "rate": float(it.rate), "amount": it.amount} for it in inv.items],
        "payments": [{"id": p.id, "amount": float(p.amount), "method": p.method, "paid_at": p.paid_at, "created_at": p.created_at} for p in inv.payments],
    }, from_attributes=True)

# --- record payment ---
@router.post("/{invoice_id}/payments", response_model=InvoiceOut, status_code=201)
def record_payment(
    invoice_id: uuid.UUID,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    inv = db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.payments),
        joinedload(Invoice.patient),
    ).filter(Invoice.id == invoice_id, Invoice.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pay = Payment(invoice_id=inv.id, amount=payload.amount, method=payload.method, paid_at=payload.paid_at)
    db.add(pay)
    db.flush()

    inv.payments.append(pay)
    inv.recompute_totals()

    db.commit()
    db.refresh(inv)

    return InvoiceOut.model_validate({
        **{c.name: getattr(inv, c.name) for c in Invoice.__table__.columns},
        "patient_name": inv.patient.name if inv.patient else None,
        "items": [{"id": it.id, "description": it.description, "qty": it.qty, "rate": float(it.rate), "amount": it.amount} for it in inv.items],
        "payments": [{"id": p.id, "amount": float(p.amount), "method": p.method, "paid_at": p.paid_at, "created_at": p.created_at} for p in inv.payments],
    }, from_attributes=True)

# --- void / delete ---
@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.is_deleted = True
    db.commit()
    return {"message": "Invoice deleted successfully"}