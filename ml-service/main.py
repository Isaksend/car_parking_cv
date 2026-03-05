"""
main.py — ML Microservice (FastAPI Worker)

This service simulates the detection pipeline.
Real ML inference (YOLOv8 + EasyOCR) will be inserted via TODO markers.

Endpoint:
  POST /process-violation — Simulate vehicle detection and forward to backend

Run with:
  uvicorn main:app --reload --port 8001
"""

import base64
import random
import string
import io
from datetime import datetime, timezone
import re
import difflib
from pathlib import Path

import httpx
import numpy as np
import cv2
from PIL import Image
from fastapi import FastAPI, BackgroundTasks, HTTPException, status, File, UploadFile
import shutil
import tempfile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import onnxruntime as ort
import easyocr

# ─── Config ────────────────────────────────────────────────────────────────
BACKEND_URL = "http://127.0.0.1:8000/api/violations"

# ─── Пути к файлам моделей ─────────────────────────────────────────────────
# Положи свои модели в папку  d:\car_parking\ml-service\models\
#
#  YOLOv8 ONNX:   d:\car_parking\ml-service\models\yolov8n.onnx
#  EasyOCR:       загружается автоматически в ~/.EasyOCR/ при первом запуске
#
MODEL_DIR   = "models"
YOLO_MODEL  = f"{MODEL_DIR}/my_plate_model.onnx"

# ─── Global ML Engines (GPU enabled) ───────────────────────────────────────
# We initialize these once to avoid expensive reloading.
providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
try:
    print(f"🚀 Initializing YOLO (ONNX) on {providers[0]}...")
    yolo_session = ort.InferenceSession(YOLO_MODEL, providers=providers)
    print(f"🚀 Initializing EasyOCR (GPU=True)...")
    ocr_reader = easyocr.Reader(["en"], gpu=True)
except Exception as e:
    print(f"⚠️ GPU Initialization failed (check CUDA/Drivers): {e}")
    # Fallback to CPU if needed (EasyOCR handles this internally, ONNX needs explicit fallback)
    yolo_session = ort.InferenceSession(YOLO_MODEL, providers=["CPUExecutionProvider"])
    ocr_reader = easyocr.Reader(["en"], gpu=False)

# ─── App Instance ──────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Traffic Control — ML Microservice",
    description="Processes camera frames to detect violations and forwards them to the backend.",
    version="1.0.0",
)

# ─── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response schemas ────────────────────────────────────────────

class ProcessRequest(BaseModel):
    """Optional request body — in production this would carry the raw camera frame."""
    camera_id: str = "CAM-001"
    frame_base64: str | None = None  # Raw camera frame (unused in mock)


class ProcessResponse(BaseModel):
    status: str
    message: str
    violation_sent: bool
    backend_response: dict | None = None


# ─── Mock Helpers ──────────────────────────────────────────────────────────

def _generate_plate() -> str:
    """Generate a random license plate string e.g. 'KZ-4821 AB'."""
    digits = "".join(random.choices(string.digits, k=4))
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    region = random.choice(["KZ", "RU", "UA", "BY", "UZ"])
    return f"{region}-{digits} {letters}"


def decode_base64_to_cv2(base64_str: str) -> np.ndarray:
    """Декодирует строку base64 в BGR numpy array (OpenCV)."""
    if not base64_str:
        return np.zeros((640, 640, 3), dtype=np.uint8)
    
    # Удаляем префикс если он есть (напр. data:image/png;base64,)
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    
    decoded = base64.b64decode(base64_str)
    nparr = np.frombuffer(decoded, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def preprocess_yolo(frame: np.ndarray, size=(640, 640)):
    """Подготовка кадра для YOLOv8 ONNX."""
    img = cv2.resize(frame, size)
    img = img.astype(np.float32)
    img /= 255.0  # Нормализация [0, 1]
    img = img.transpose(2, 0, 1)  # HWC to CHW
    return np.expand_dims(img, axis=0)  # Добавляем batch dimension

def postprocess_yolo(outputs: list, original_shape: tuple, conf_threshold=0.25):
    """
    Разбор выхода YOLOv8 ONNX (формат [1, 84, 8400]).
    """
    predictions = np.squeeze(outputs[0])
    
    # В YOLOv8 выход обычно: [x_center, y_center, width, height, class0_score, ...]
    # Транспонируем, чтобы получить [8400, 84]
    if predictions.shape[0] < predictions.shape[1]:
        predictions = predictions.T
    
    scores = np.max(predictions[:, 4:], axis=1)
    predictions = predictions[scores > conf_threshold]
    scores = scores[scores > conf_threshold]
    
    if len(scores) == 0:
        return [], [], []

    class_ids = np.argmax(predictions[:, 4:], axis=1)
    boxes = predictions[:, :4]
    
    # Масштабируем боксы под оригинал
    img_h, img_w = original_shape[:2]
    x_factor = img_w / 640
    y_factor = img_h / 640
    
    # x_center, y_center, w, h -> x1, y1, x2, y2
    boxes_list = []
    tmp_scores = []
    for i, box in enumerate(boxes):
        x, y, w, h = box
        left = int((x - 0.5 * w) * x_factor)
        top = int((y - 0.5 * h) * y_factor)
        width = int(w * x_factor)
        height = int(h * y_factor)
        boxes_list.append([left, top, width, height])
        tmp_scores.append(float(scores[i]))
        
    # Применяем NMS для удаления дубликатов
    indices = cv2.dnn.NMSBoxes(boxes_list, tmp_scores, conf_threshold, 0.45)
    
    final_boxes = []
    final_scores = []
    final_class_ids = []
    
    if len(indices) > 0:
        for i in indices.flatten():
            x, y, w, h = boxes_list[i]
            final_boxes.append([x, y, x + w, y + h])
            final_scores.append(tmp_scores[i])
            final_class_ids.append(class_ids[i])
            
    return final_boxes, final_scores, final_class_ids

def get_iou(box1, box2):
    """Calculate Intersection over Union for two boxes [x1, y1, x2, y2]."""
    x1_inter = max(box1[0], box2[0])
    y1_inter = max(box1[1], box2[1])
    x2_inter = min(box1[2], box2[2])
    y2_inter = min(box1[3], box2[3])
    
    inter_area = max(0, x2_inter - x1_inter) * max(0, y2_inter - y1_inter)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = area1 + area2 - inter_area
    
    return inter_area / union_area if union_area > 0 else 0

def enhance_plate(img):
    """Подготовка картинки номера для лучшего чтения EasyOCR (из твоего примера)"""
    if img is None or img.size == 0:
        return img
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Увеличиваем разрешение в 2 раза
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    # Улучшаем локальный контраст (помогает при тенях и засветах)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    return clahe.apply(gray)

def _filter_plate_text(text_list: list) -> str:
    """
    Filters out camera OSD metadata and returns the most likely license plate string.
    """
    garbage_patterns = [
        r"\d{4}-\d{2}-\d{2}",       # YYYY-MM-DD
        r"\d{2}:\d{2}:\d{2}",       # HH:MM:SS
        r"CAMERA", "IP", "NVR", "DVR", "CH\d+", 
        r"P2P", "SYSTEM", "INFO", r"20\d{2}"
    ]
    
    candidates = []
    for text in text_list:
        orig_text = text.strip().upper()
        # Clean text: keep ONLY Latin alphanumeric characters
        clean_text = re.sub(r"[^A-Z0-9]", "", orig_text)
        
        is_garbage = any(re.search(p, orig_text, re.IGNORECASE) for p in garbage_patterns)
        
        # Valid plate candidates are usually 4-9 chars and not metadata
        if not is_garbage and 4 <= len(clean_text) <= 10:
            candidates.append(clean_text)
            
    # Join candidates or return the longest one if multiple found
    if not candidates:
        return ""
    
    # Sort by length descending and take the longest reasonable one
    candidates.sort(key=len, reverse=True)
    return candidates[0]
def _generate_dummy_image_base64() -> str:
    """
    Return a tiny placeholder base64-encoded PNG (1×1 red pixel).
    """
    raw = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
        b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return base64.b64encode(raw).decode("utf-8")

def _generate_mock_violation():
    """Fallback if ML is unavailable."""
    return {
        "plate_number": _generate_plate(),
        "speed": round(random.uniform(70, 110), 1),
        "violation_type": "Speeding (Mock)",
        "photo_base64": _generate_dummy_image_base64(),
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }

def _mock_detect_vehicle(frame_base64: str | None) -> dict | None:
    """
    Core detection pipeline using global GPU-enabled engines.
    """
    if not frame_base64:
        frame_base64 = _generate_dummy_image_base64()

    try:
        if not Path(YOLO_MODEL).exists():
            return _generate_mock_violation()

        # ── 1. Image Preprocessing ──
        frame = decode_base64_to_cv2(frame_base64)
        blob = preprocess_yolo(frame)
        
        # ── 2. YOLO Inference ──
        outputs = yolo_session.run(None, {"images": blob})
        boxes, scores, class_ids = postprocess_yolo(outputs, frame.shape)

        if not boxes:
            return None

        # ── 3. Plate OCR with Enhancement ──
        # Use first box (best score)
        x1, y1, x2, y2 = map(int, boxes[0])
        
        # Add 5% padding for OCR
        h_img, w_img = frame.shape[:2]
        pad_x = int((x2 - x1) * 0.05)
        pad_y = int((y2 - y1) * 0.05)
        crop_x1, crop_y1 = max(0, x1 - pad_x), max(0, y1 - pad_y)
        crop_x2, crop_y2 = min(w_img, x2 + pad_x), min(h_img, y2 + pad_y)
        
        plate_crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
        if plate_crop.size == 0:
            plate_crop = frame

        # Enhance image
        enhanced = enhance_plate(plate_crop)
        
        # OCR
        ocr_results = ocr_reader.readtext(enhanced, detail=1)
        
        best_plate = ""
        best_conf = 0.0
        
        # Filtering logic: strictly Latin, must have letter, ignore OSD
        for (_, text, prob) in ocr_results:
            clean_text = "".join(e for e in text if e.isalnum()).upper()
            # Strict Latin filter
            clean_text = re.sub(r"[^A-Z0-9]", "", clean_text)
            
            # Metadata filtering
            garbage_patterns = [r"CAMERA", r"IP", r"NVR", r"SYSTEM", r"INFO", r"\d{4}-\d{2}-\d{2}"]
            is_garbage = any(re.search(p, text, re.IGNORECASE) for p in garbage_patterns)
            
            has_letter = any(c.isalpha() for c in clean_text)
            
            if not is_garbage and prob > 0.4 and 4 <= len(clean_text) <= 10 and has_letter:
                # Common OCR Fixes: Standardize 0/O and 1/I confusion in numeric/alpha positions
                # For simplicity: just replace O with 0 and I with 1 if they are likely numeric
                # but license plates are mixed. For now, just keep the clean_text as is.
                if len(clean_text) > len(best_plate):
                    best_plate = clean_text
                    best_conf = prob

        plate_text = best_plate if best_plate else "UNKNOWN"
        
        return {
            "plate_number": plate_text,
            "speed": round(random.uniform(65.0, 115.0), 1),
            "violation_type": "Speeding",
            "photo_base64": frame_base64,
            "detected_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        print(f"❌ ML Pipeline Error: {e}")
        return None

async def _forward_to_backend(detection: dict) -> dict:
    """Forward detection to backend-service."""
    payload = {
        "plate_number": detection["plate_number"],
        "speed": detection["speed"],
        "violation_type": detection["violation_type"],
        "photo_base64": detection["photo_base64"],
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(BACKEND_URL, json=payload)
        if response.status_code != 201:
            print(f"❌ Backend Error {response.status_code}: {response.text}")
        response.raise_for_status()
        return response.json()

# ─── API Routes ────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "gpu": ort.get_available_providers()}

@app.post("/process-violation", response_model=ProcessResponse, tags=["ML Pipeline"])
async def process_violation(payload: ProcessRequest):
    detection = _mock_detect_vehicle(payload.frame_base64)
    if not detection:
        return ProcessResponse(status="clean", message="No detections.", violation_sent=False)
    
    try:
        resp = await _forward_to_backend(detection)
        return ProcessResponse(
            status="violation_recorded",
            message=f"Recorded: {detection['plate_number']}",
            violation_sent=True,
            backend_response=resp
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/process-file", tags=["ML Pipeline"])
async def process_file(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        detections_list = []
        found_plates = set()

        if suffix in [".jpg", ".jpeg", ".png"]:
            img = cv2.imread(tmp_path)
            if img is not None:
                _, buffer = cv2.imencode(".jpg", img)
                b64 = base64.b64encode(buffer).decode("utf-8")
                det = _mock_detect_vehicle(b64)
                if det:
                    detections_list.append(det)

        elif suffix in [".mp4", ".avi", ".mov"]:
            cap = cv2.VideoCapture(tmp_path)
            h_vid = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            osd_margin = int(h_vid * 0.15)
            frame_idx = 0
            
            # TRACKING STATE
            # Each track: { 'best_score': float, 'best_frame_b64': str, 'last_box': list }
            active_tracks = []
            
            print(f"🎬 Processing video: {file.filename} (GPU Accelerated)")
            while frame_idx < 600: # Scan up to 20 seconds
                success, vid_frame = cap.read()
                if not success:
                    break
                
                # Scan every 5 frames for speed, but keep the GPU busy
                if frame_idx % 5 == 0:
                    blob = preprocess_yolo(vid_frame)
                    outputs = yolo_session.run(None, {"images": blob})
                    boxes, scores, class_ids = postprocess_yolo(outputs, vid_frame.shape)
                    
                    for i, box in enumerate(boxes):
                        x1, y1, x2, y2 = map(int, box)
                        score = scores[i]
                        center_y = (y1 + y2) / 2
                        
                        # Skip OSD noise
                        if center_y < osd_margin or center_y > (h_vid - osd_margin):
                            continue
                        
                        # Match with active tracks
                        matched_track = None
                        for track in active_tracks:
                            if get_iou(box, track['last_box']) > 0.3:
                                matched_track = track
                                break
                        
                        if matched_track:
                            # Update existing track with a better frame if found
                            matched_track['last_box'] = box
                            if score > matched_track['best_score']:
                                _, buffer = cv2.imencode(".jpg", vid_frame)
                                matched_track['best_frame_b64'] = base64.b64encode(buffer).decode("utf-8")
                                matched_track['best_score'] = score
                        else:
                            # New vehicle detected
                            _, buffer = cv2.imencode(".jpg", vid_frame)
                            active_tracks.append({
                                'best_score': score,
                                'best_frame_b64': base64.b64encode(buffer).decode("utf-8"),
                                'last_box': box
                            })
                frame_idx += 1
            cap.release()

            # Now run OCR ONLY on the best frame of each unique track
            # This is MUCH faster and more accurate than OCRing every frame
            detections_list = []
            final_found_plates = set()
            
            print(f"🎯 Found {len(active_tracks)} vehicle candidates. Running OCR on best frames...")
            for track in active_tracks:
                det = _mock_detect_vehicle(track['best_frame_b64'])
                if det and det["plate_number"] != "UNKNOWN":
                    plate = det["plate_number"]
                    
                    # deduplicate similar plates (fuzzy match)
                    is_dup = False
                    for seen in final_found_plates:
                        if difflib.SequenceMatcher(None, plate, seen).ratio() > 0.7:
                            is_dup = True
                            break
                    
                    if not is_dup:
                        final_found_plates.add(plate)
                        detections_list.append(det)

        # Final results
        if not detections_list:
            return {"status": "no_detection", "message": "No vehicle or plate found."}

        sent_results = []
        for d in detections_list:
            try:
                backend_resp = await _forward_to_backend(d)
                sent_results.append({"plate": d["plate_number"], "backend_id": backend_resp.get("id")})
            except:
                pass

        return {
            "status": "success",
            "count": len(sent_results),
            "detections": sent_results
        }

    finally:
        if Path(tmp_path).exists():
            Path(tmp_path).unlink()

@app.post("/process-violation/batch", tags=["ML Pipeline"])
async def batch_process(count: int = 10):
    results = []
    for _ in range(count):
        detection = _mock_detect_vehicle(None)
        if detection:
            try:
                resp = await _forward_to_backend(detection)
                results.append({"sent": True, "plate": detection["plate_number"]})
            except:
                results.append({"sent": False})
    return {"total": count, "sent": sum(1 for r in results if r.get("sent"))}
