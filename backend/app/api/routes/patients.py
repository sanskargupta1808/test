from __future__ import annotations
import uuid
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ...core.deps import get_db
from ...models.patient import Patient
from ...schemas.patient import PatientCreate, PatientUpdate, PatientOut, PatientPage

router = APIRouter(prefix="/patients", tags=["patients"])

def apply_filters(qs, q: Optional[str]):
    if q:
        qs = qs.filter(
            or_(
                func.lower(Patient.name).like(f"%{q.lower()}%"),
                func.lower(Patient.email).like(f"%{q.lower()}%"),
                func.lower(Patient.phone).like(f"%{q.lower()}%")
            )
        )
    qs = qs.filter(Patient.is_deleted == False)
    return qs

# --- list ---
@router.get("", response_model=PatientPage)
def list_patients(
    response: Response,
    q: Optional[str] = Query(None, description="Search by name/email/phone"),
    sort_by: Literal["name","created_at"] = "created_at",
    sort_dir: Literal["asc","desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    qs = db.query(Patient)
    qs = apply_filters(qs, q)
    total = qs.count()

    sort_col = Patient.name if sort_by == "name" else Patient.created_at
    qs = qs.order_by(sort_col.asc() if sort_dir=="asc" else sort_col.desc())

    items = qs.offset((page-1)*page_size).limit(page_size).all()
    out: List[PatientOut] = [PatientOut.model_validate(i, from_attributes=True) for i in items]

    response.headers["X-Total-Count"] = str(total)
    return {"items": out, "total": total, "page": page, "page_size": page_size}

# --- create ---
@router.post("", response_model=PatientOut, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    p = Patient(**payload.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return PatientOut.model_validate(p, from_attributes=True)

# --- retrieve ---
@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: uuid.UUID, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientOut.model_validate(p, from_attributes=True)

# --- update ---
@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: uuid.UUID, payload: PatientUpdate, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    for k,v in payload.dict(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return PatientOut.model_validate(p, from_attributes=True)

# --- delete (soft) ---
@router.delete("/{patient_id}")
def delete_patient(patient_id: uuid.UUID, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    p.is_deleted = True
    db.commit()
    return {"message": "Patient deleted successfully"}