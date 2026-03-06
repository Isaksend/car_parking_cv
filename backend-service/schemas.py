"""
schemas.py — Pydantic models for request validation and response serialization.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ViolationCreate(BaseModel):
    """Schema for creating a new violation (incoming from ML service)."""

    plate_number: str = Field(..., min_length=1, max_length=20, description="Vehicle license plate")
    speed: float = Field(..., ge=0, description="Measured speed in km/h")
    violation_type: str = Field(..., description="Type of violation (e.g. 'Speeding', 'Wrong Parking')")
    photo_base64: Optional[str] = Field(None, description="Base64-encoded cropped image of the vehicle")

    model_config = {"json_schema_extra": {
        "example": {
            "plate_number": "ABC-1234",
            "speed": 95.5,
            "violation_type": "Speeding",
            "photo_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
        }
    }}


class ViolationResponse(BaseModel):
    """Schema for returning a violation record to the frontend."""

    id: str
    plate_number: str
    speed: float
    violation_type: str
    photo_base64: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}  # Pydantic v2 (replaces orm_mode)


class WantedVehicleCreate(BaseModel):
    plate_number: str = Field(..., min_length=1, max_length=20)
    reason: str = Field(..., description="Reason why the vehicle is wanted")

    model_config = {"json_schema_extra": {
        "example": {
            "plate_number": "A123BC77",
            "reason": "Suspected of theft",
        }
    }}

class WantedVehicleResponse(BaseModel):
    id: str
    plate_number: str
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}
