from __future__ import annotations
import uuid
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ...core.deps import get_db
from ...models.medicine import Medicine
from ...schemas.medicine import MedicineCreate, MedicineUpdate, MedicineOut, MedicinePage, StockAdjust

router = APIRouter(prefix="/medicines", tags=["medicines"])
def apply_filters(qs, q: Optional[str]):
    qs = qs.filter(Medicine.is_deleted == False)
    if q:
        ql = f"%{q.lower()}%"
        qs = qs.filter(
            or_(
                func.lower(Medicine.name).like(ql),
                func.lower(Medicine.strength).like(ql),
                func.lower(Medicine.dosage_form).like(ql),
                func.lower(Medicine.manufacturer).like(ql),
            )
        )
    return qs

# -------- list --------
@router.get("", response_model=MedicinePage)
def list_medicines(
    response: Response,
    q: Optional[str] = Query(None, description="Search by name/strength/form/manufacturer"),
    sort_by: Literal["name","stock_quantity","price","created_at"] = "name",
    sort_dir: Literal["asc","desc"] = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=200),
    db: Session = Depends(get_db),
):
    qs = db.query(Medicine)
    qs = apply_filters(qs, q)

    total = qs.count()

    sort_col = {
        "name": Medicine.name,
        "stock_quantity": Medicine.stock_quantity,
        "price": Medicine.price,
        "created_at": Medicine.created_at,
    }[sort_by]
    qs = qs.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    items = qs.offset((page-1)*page_size).limit(page_size).all()
    out: List[MedicineOut] = [MedicineOut.model_validate(i, from_attributes=True) for i in items]

    response.headers["X-Total-Count"] = str(total)
    return {"items": out, "total": total, "page": page, "page_size": page_size}

# -------- create --------
@router.post("", response_model=MedicineOut, status_code=201)
def create_medicine(payload: MedicineCreate, db: Session = Depends(get_db)):
    m = Medicine(**payload.dict())
    db.add(m)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # most likely uniqueness violation on (name, strength, dosage_form)
        raise HTTPException(status_code=400, detail="Medicine already exists with same name/strength/form")
    db.refresh(m)
    return MedicineOut.model_validate(m, from_attributes=True)

# -------- retrieve --------
@router.get("/{medicine_id}", response_model=MedicineOut)
def get_medicine(medicine_id: uuid.UUID, db: Session = Depends(get_db)):
    m = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.is_deleted == False).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return MedicineOut.model_validate(m, from_attributes=True)

# -------- update (PATCH) --------
@router.patch("/{medicine_id}", response_model=MedicineOut)
def update_medicine(medicine_id: uuid.UUID, payload: MedicineUpdate, db: Session = Depends(get_db)):
    m = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.is_deleted == False).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(m, k, v)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Update failed (duplicate name/strength/form?)")
    db.refresh(m)
    return MedicineOut.model_validate(m, from_attributes=True)

# -------- stock adjust (quick in/out) --------
@router.post("/{medicine_id}/stock", response_model=MedicineOut)
def adjust_stock(medicine_id: uuid.UUID, payload: StockAdjust, db: Session = Depends(get_db)):
    m = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.is_deleted == False).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")
    m.adjust_stock(payload.delta)
    db.commit()
    db.refresh(m)
    return MedicineOut.model_validate(m, from_attributes=True)

# -------- delete (soft) --------
@router.delete("/{medicine_id}")
def delete_medicine(medicine_id: uuid.UUID, db: Session = Depends(get_db)):
    m = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.is_deleted == False).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")
    m.is_deleted = True
    db.commit()
    return {"message": "Medicine deleted successfully"}