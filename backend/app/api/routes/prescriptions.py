from __future__ import annotations
import uuid
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from ..core.deps import get_db
from ..models.prescription import Prescription
from ..models.patient import Patient
from ..models.medicine import Medicine
from ..schemas.prescription import PrescriptionCreate, PrescriptionUpdate, PrescriptionOut, PrescriptionPage

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

# --- filters ---
def apply_filters(qs, q: Optional[str], patient_id: Optional[uuid.UUID], medicine_id: Optional[uuid.UUID]):
    qs = qs.filter(Prescription.is_deleted == False)
    if patient_id:
        qs = qs.filter(Prescription.patient_id == patient_id)
    if medicine_id:
        qs = qs.filter(Prescription.medicine_id == medicine_id)
    if q:
        qs = qs.join(Patient, Prescription.patient_id == Patient.id).join(Medicine, Prescription.medicine_id == Medicine.id).filter(
            or_(
                func.lower(Patient.name).like(f"%{q.lower()}%"),
                func.lower(Medicine.name).like(f"%{q.lower()}%"),
                func.lower(Prescription.instructions).like(f"%{q.lower()}%")
            )
        )
    return qs

# --- list ---
@router.get("", response_model=PrescriptionPage)
def list_prescriptions(
    response: Response,
    q: Optional[str] = Query(None, description="Search text"),
    patient_id: Optional[uuid.UUID] = None,
    medicine_id: Optional[uuid.UUID] = None,
    sort_by: Literal["created_at","quantity"] = "created_at",
    sort_dir: Literal["asc","desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    qs = db.query(Prescription).options(
        joinedload(Prescription.patient),
        joinedload(Prescription.medicine),
    )
    qs = apply_filters(qs, q, patient_id, medicine_id)
    total = qs.count()

    sort_col = Prescription.created_at if sort_by=="created_at" else Prescription.quantity
    qs = qs.order_by(sort_col.asc() if sort_dir=="asc" else sort_col.desc())

    items = qs.offset((page-1)*page_size).limit(page_size).all()

    out: List[PrescriptionOut] = []
    for pr in items:
        out.append(PrescriptionOut.model_validate({
            **{c.name: getattr(pr, c.name) for c in Prescription.__table__.columns},
            "patient_name": pr.patient.name if pr.patient else None,
            "medicine_name": pr.medicine.name if pr.medicine else None,
        }, from_attributes=True))

    response.headers["X-Total-Count"] = str(total)
    return {"items": out, "total": total, "page": page, "page_size": page_size}

# --- create ---
@router.post("", response_model=PrescriptionOut, status_code=201)
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    medicine = db.query(Medicine).filter(Medicine.id == payload.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    pr = Prescription(**payload.dict())
    db.add(pr)
    db.commit()
    db.refresh(pr)

    return PrescriptionOut.model_validate({
        **{c.name: getattr(pr, c.name) for c in Prescription.__table__.columns},
        "patient_name": patient.name,
        "medicine_name": medicine.name,
    }, from_attributes=True)

# --- retrieve ---
@router.get("/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(prescription_id: uuid.UUID, db: Session = Depends(get_db)):
    pr = db.query(Prescription).options(
        joinedload(Prescription.patient),
        joinedload(Prescription.medicine),
    ).filter(Prescription.id == prescription_id, Prescription.is_deleted == False).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Prescription not found")

    return PrescriptionOut.model_validate({
        **{c.name: getattr(pr, c.name) for c in Prescription.__table__.columns},
        "patient_name": pr.patient.name if pr.patient else None,
        "medicine_name": pr.medicine.name if pr.medicine else None,
    }, from_attributes=True)

# --- update ---
@router.patch("/{prescription_id}", response_model=PrescriptionOut)
def update_prescription(prescription_id: uuid.UUID, payload: PrescriptionUpdate, db: Session = Depends(get_db)):
    pr = db.query(Prescription).filter(Prescription.id == prescription_id, Prescription.is_deleted == False).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Prescription not found")

    for k,v in payload.dict(exclude_unset=True).items():
        setattr(pr, k, v)

    db.commit()
    db.refresh(pr)

    return PrescriptionOut.model_validate(pr, from_attributes=True)

# --- delete (soft) ---
@router.delete("/{prescription_id}")
def delete_prescription(prescription_id: uuid.UUID, db: Session = Depends(get_db)):
    pr = db.query(Prescription).filter(Prescription.id == prescription_id, Prescription.is_deleted == False).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Prescription not found")
    pr.is_deleted = True
    db.commit()
    return {"message": "Prescription deleted successfully"}