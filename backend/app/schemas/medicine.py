from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

class MedicineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    generic_name: Optional[str] = Field(None, max_length=255)
    dosage_form: Optional[str] = Field(None, max_length=50)
    strength: Optional[str] = Field(None, max_length=50)
    manufacturer: Optional[str] = Field(None, max_length=255)
    price: str = Field(default="0")  # Store as string
    stock_quantity: int = Field(default=0, ge=0)

class MedicineCreate(MedicineBase):
    pass

class MedicineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    generic_name: Optional[str] = Field(None, max_length=255)
    dosage_form: Optional[str] = Field(None, max_length=50)
    strength: Optional[str] = Field(None, max_length=50)
    manufacturer: Optional[str] = Field(None, max_length=255)
    price: Optional[str] = None
    stock_quantity: Optional[int] = Field(None, ge=0)

class MedicineOut(MedicineBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class MedicinePage(BaseModel):
    items: List[MedicineOut]
    total: int
    page: int
    page_size: int

class StockAdjust(BaseModel):
    quantity: int
    reason: Optional[str] = None
