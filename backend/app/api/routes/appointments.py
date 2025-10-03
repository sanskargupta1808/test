from __future__ import annotations
import uuid
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_

from ...core.deps import get_db
from ...models.appointment import Appointment
from ...models.patient import Patient
from ...schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentOut, AppointmentPage

router = APIRouter(prefix="/appointments", tags=["appointments"])

def apply_filters(qs, q: Optional[str], date_from: Optional[str], date_to: Optional[str], patient_id: Optional[uuid.UUID]):
    qs = qs.filter(Appointment.is_deleted == False)
    if patient_id:
        qs = qs.filter(Appointment.patient_id == patient_id)
    if date_from:
        qs = qs.filter(Appointment.appt_date >= date_from)
    if date_to:
        qs = qs.filter(Appointment.appt_date <= date_to)
    if q:
        qs = qs.join(Patient, Patient.id == Appointment.patient_id).filter(
            or_(
                func.lower(Patient.name).like(f"%{q.lower()}%"),
                func.lower(Appointment.issue).like(f"%{q.lower()}%"),
                func.lower(Appointment.diagnosis).like(f"%{q.lower()}%"),
                func.lower(Appointment.notes).like(f"%{q.lower()}%")
            )
        )
    return qs

@router.get("", response_model=AppointmentPage)
def list_appointments(
    response: Response,
    q: Optional[str] = Query(None, description="Search name/issue/diagnosis"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    patient_id: Optional[uuid.UUID] = Query(None),
    sort_by: Literal["appt_date","created_at"] = "appt_date",
    sort_dir: Literal["asc","desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=200),
    db: Session = Depends(get_db),
):
    qs = db.query(Appointment).options(joinedload(Appointment.patient))
    qs = apply_filters(qs, q, date_from, date_to, patient_id)
    total = qs.count()

    sort_col = Appointment.appt_date if sort_by == "appt_date" else Appointment.created_at
    qs = qs.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    items = qs.offset((page-1)*page_size).limit(page_size).all()

    out: List[AppointmentOut] = []
    for a in items:
        out.append(AppointmentOut.model_validate({
            **{c.name: getattr(a, c.name) for c in Appointment.__table__.columns},
            "patient_name": a.patient.name if a.patient else None,
        }, from_attributes=True))

    response.headers["X-Total-Count"] = str(total)
    return {"items": out, "total": total, "page": page, "page_size": page_size}

@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    pat = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient not found")
    a = Appointment(**payload.dict())
    db.add(a); db.commit(); db.refresh(a)
    return AppointmentOut.model_validate({
        **{c.name: getattr(a, c.name) for c in Appointment.__table__.columns},
        "patient_name": pat.name
    }, from_attributes=True)

@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: uuid.UUID, db: Session = Depends(get_db)):
    a = db.query(Appointment).options(joinedload(Appointment.patient)).filter(
        Appointment.id == appointment_id, Appointment.is_deleted == False
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return AppointmentOut.model_validate({
        **{c.name: getattr(a, c.name) for c in Appointment.__table__.columns},
        "patient_name": a.patient.name if a.patient else None
    }, from_attributes=True)

@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(appointment_id: uuid.UUID, payload: AppointmentUpdate, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.is_deleted == False).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    for k,v in payload.dict(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit(); db.refresh(a)
    return AppointmentOut.model_validate(a, from_attributes=True)

@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: uuid.UUID, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.is_deleted == False).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    a.is_deleted = True
    db.commit()
    return {"message": "Appointment deleted successfully"}