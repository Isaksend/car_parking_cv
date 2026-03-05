"""
main.py — Main Backend FastAPI application.

Endpoints:
  POST /api/violations  — Accept new violations from the ML service
  GET  /api/violations  — Retrieve all violations sorted by created_at DESC

Run with:
  uvicorn main:app --reload --port 8000
"""

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

# ─── Create all tables on startup ──────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

# ─── App Instance ──────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Traffic Control — Main Backend",
    description="Receives violations from the ML service and serves them to the dashboard.",
    version="1.0.0",
)

# ─── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite React dev server
        "http://127.0.0.1:5173",
        "http://localhost:5174",   # Vite React dev server (alternative port)
        "http://127.0.0.1:5174",
        "http://localhost:8001",   # ML service (if it ever needs to read back)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def health_check():
    """Simple health-check endpoint."""
    return {"status": "ok", "service": "backend-service", "port": 8000}


@app.post(
    "/api/violations",
    response_model=schemas.ViolationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Violations"],
    summary="Record a new traffic violation",
)
def create_violation(
    payload: schemas.ViolationCreate,
    db: Session = Depends(get_db),
):
    """
    Accept a violation report from the ML service and persist it to the DB.

    - **plate_number**: License plate string
    - **speed**: Measured speed in km/h
    - **violation_type**: e.g. 'Speeding', 'Wrong Parking'
    - **photo_base64**: Cropped image encoded as base64
    """
    violation = models.Violation(
        id=str(uuid.uuid4()),
        plate_number=payload.plate_number,
        speed=payload.speed,
        violation_type=payload.violation_type,
        photo_base64=payload.photo_base64,
        created_at=datetime.now(timezone.utc),
    )
    db.add(violation)
    db.commit()
    db.refresh(violation)
    return violation


@app.get(
    "/api/violations",
    response_model=List[schemas.ViolationResponse],
    tags=["Violations"],
    summary="List all traffic violations",
)
def list_violations(db: Session = Depends(get_db)):
    """
    Return all recorded violations sorted by creation time (newest first).
    """
    violations = (
        db.query(models.Violation)
        .order_by(models.Violation.created_at.desc())
        .all()
    )
    return violations
