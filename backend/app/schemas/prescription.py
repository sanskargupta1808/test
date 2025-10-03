from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, conint

class PrescriptionBase(BaseModel):
    patient_id: UUID
    medicine_id: UUID
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity: conint(ge=1) = 1
    instructions: Optional[str] = None

class PrescriptionCreate(PrescriptionBase): ...
class PrescriptionUpdate(BaseModel):
    patient_id: Optional[UUID] = None
    medicine_id: Optional[UUID] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[conint(ge=1)] = None
    instructions: Optional[str] = None

class PrescriptionOut(PrescriptionBase):
    id: UUID
    patient_name: Optional[str] = None
    medicine_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class PrescriptionPage(BaseModel):
    items: List[PrescriptionOut]
    total: int
    page: int
    page_size: int