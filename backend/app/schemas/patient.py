from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=20)
    blood_group: Optional[str] = Field(None, max_length=10)
    address: Optional[str] = Field(None, max_length=255)
    allergies: Optional[str] = Field(None, max_length=255)
    medical_history: Optional[str] = Field(None, max_length=255)
    emergency_contact: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=255)
    medical_images: Optional[str] = None  # JSON string of file data

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=20)
    blood_group: Optional[str] = Field(None, max_length=10)
    address: Optional[str] = Field(None, max_length=255)
    allergies: Optional[str] = Field(None, max_length=255)
    medical_history: Optional[str] = Field(None, max_length=255)
    emergency_contact: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=255)
    medical_images: Optional[str] = None

class PatientOut(PatientBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PatientPage(BaseModel):
    items: List[PatientOut]
    total: int
    page: int
    page_size: int
