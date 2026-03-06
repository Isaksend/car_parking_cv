"""
models.py — SQLAlchemy ORM models for the Traffic Control System.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, Text, DateTime
from database import Base


class Violation(Base):
    """Represents a traffic violation record stored in the database."""

    __tablename__ = "violations"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    plate_number = Column(String, nullable=False, index=True)
    speed = Column(Float, nullable=False)
    violation_type = Column(String, nullable=False)
    photo_base64 = Column(Text, nullable=True)  # Cropped vehicle image as base64
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Violation id={self.id!r} plate={self.plate_number!r} "
            f"type={self.violation_type!r} speed={self.speed}>"
        )


class WantedVehicle(Base):
    """Represents a vehicle currently wanted by security/police."""

    __tablename__ = "wanted_vehicles"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    plate_number = Column(String, nullable=False, unique=True, index=True)
    reason = Column(String, nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<WantedVehicle plate={self.plate_number!r} reason={self.reason!r}>"
