from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

class AppointmentBase(BaseModel):
    patient_id: UUID
    appointment_date: datetime
    duration_minutes: int = Field(default=30, ge=15, le=240)
    status: str = Field(default="scheduled", max_length=20)
    reason: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=255)

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=240)
    status: Optional[str] = Field(None, max_length=20)
    reason: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=255)

class AppointmentOut(AppointmentBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AppointmentPage(BaseModel):
    items: List[AppointmentOut]
    total: int
    page: int
    page_size: int
