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
from typing import List, Optional
import base64
import os

import httpx
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

# ─── Create all tables on startup ──────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

# ─── Telegram Config ───────────────────────────────────────────────────────
TG_BOT_TOKEN = "8005142832:AAF94l-M5Q9BuOGRst-QgSFwSTQiejr51oA"
TG_CHAT_ID = "876098533"

async def send_telegram_notification(plate: str, time_str: str, photo_b64: Optional[str], is_wanted: bool, reason: str = ""):
    """Async helper to send a message + photo to Telegram via httpx."""
    if not TG_BOT_TOKEN or not TG_CHAT_ID:
        return

    # Build the message text
    if is_wanted:
        text = (
            f"🚨 **ВНИМАНИЕ! РОЗЫСК!** 🚨\n\n"
            f"📍 Камера: `Главный въезд`\n"
            f"🚗 Номер: **{plate}**\n"
            f"⚠️ Причина: `{reason}`\n"
            f"🕒 Время: `{time_str}`"
        )
    else:
        text = (
            f"ℹ️ **Фиксация автомобиля**\n\n"
            f"📍 Камера: `Главный въезд`\n"
            f"🚗 Номер: **{plate}**\n"
            f"🕒 Время: `{time_str}`"
        )

    url = f"https://api.telegram.org/bot{TG_BOT_TOKEN}/"
    async with httpx.AsyncClient() as client:
        try:
            if photo_b64:
                # Decode base64 and send as photo
                photo_data = base64.b64decode(photo_b64)
                files = {"photo": ("car.jpg", photo_data, "image/jpeg")}
                data = {"chat_id": TG_CHAT_ID, "caption": text, "parse_mode": "Markdown"}
                await client.post(url + "sendPhoto", data=data, files=files)
            else:
                # Just send text message
                data = {"chat_id": TG_CHAT_ID, "text": text, "parse_mode": "Markdown"}
                await client.post(url + "sendMessage", data=data)
        except Exception as e:
            print(f"Telegram error: {e}")

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
    background_tasks: BackgroundTasks,
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
    
    # ─── Check Wanted List ───
    wanted = db.query(models.WantedVehicle).filter(models.WantedVehicle.plate_number == payload.plate_number).first()
    is_wanted = bool(wanted)
    reason = wanted.reason if wanted else ""
    time_str = violation.created_at.strftime("%H:%M:%S %Y-%m-%d")

    # Fire off telegram notification in background!
    background_tasks.add_task(
        send_telegram_notification,
        plate=payload.plate_number,
        time_str=time_str,
        photo_b64=payload.photo_base64,
        is_wanted=is_wanted,
        reason=reason
    )

    db.commit()
    db.refresh(violation)
    return violation


# ─── Wanted Vehicles Endpoints ─────────────────────────────────────────────

@app.post(
    "/api/wanted",
    response_model=schemas.WantedVehicleResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Wanted"],
    summary="Add a vehicle to the wanted list",
)
def add_wanted_vehicle(
    payload: schemas.WantedVehicleCreate,
    db: Session = Depends(get_db),
):
    # Check if already exists
    existing = db.query(models.WantedVehicle).filter(models.WantedVehicle.plate_number == payload.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle already in wanted list.")
    
    wanted = models.WantedVehicle(
        id=str(uuid.uuid4()),
        plate_number=payload.plate_number.upper(),
        reason=payload.reason,
        created_at=datetime.now(timezone.utc),
    )
    db.add(wanted)
    db.commit()
    db.refresh(wanted)
    return wanted


@app.get(
    "/api/wanted",
    response_model=List[schemas.WantedVehicleResponse],
    tags=["Wanted"],
    summary="List all wanted vehicles",
)
def list_wanted_vehicles(db: Session = Depends(get_db)):
    return db.query(models.WantedVehicle).order_by(models.WantedVehicle.created_at.desc()).all()


@app.delete(
    "/api/wanted/{plate_number}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Wanted"],
    summary="Remove a vehicle from the wanted list",
)
def remove_wanted_vehicle(plate_number: str, db: Session = Depends(get_db)):
    wanted = db.query(models.WantedVehicle).filter(models.WantedVehicle.plate_number == plate_number.upper()).first()
    if not wanted:
        raise HTTPException(status_code=404, detail="Vehicle not found in wanted list.")
    
    db.delete(wanted)
    db.commit()
    return None


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
