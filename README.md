# 🛡️ Smart Traffic AI — Car Parking & Violation System

A high-performance, machine learning-powered traffic control system designed to detect license plates, monitor speeding, and record parking violations in real-time from video feeds and images.

---

## 🏗️ Architecture

The project is built using a modern microservices architecture:

1.  **[Frontend Dashboard](./frontend-dashboard)**: A premium React interface (Vite) for monitoring live violations and processing media files.
2.  **[Backend Service](./backend-service)**: A robust FastAPI application that handles data persistence (SQLite) and business logic.
3.  **[ML Service](./ml-service)**: The intelligence hub. Uses YOLOv8 for vehicle detection and EasyOCR for license plate recognition with full GPU acceleration.

---

## 🚀 Key Features

*   **GPU Accelerated Inference**: Powered by NVIDIA CUDA/TensorRT for real-time video processing.
*   **Advanced Multi-Car Tracking**: Implements IoU-based track matching with identity persistence and track aging to reliably follow multiple vehicles simultaneously without overwriting data.
*   **Multi-Stage OCR Preprocessing**: Uses CLAHE, Bilateral Filtering, and Otsu's Thresholding with Morphological Closing to enhance blurry, shadowed, or dirty license plates before they reach the OCR engine.
*   **Smart Majority Voting**: Analyzes the top 5 clearest frames of a video per tracked vehicle and uses regex-based strict format matching and probability scoring to prevent guessing OSD or garbage text.
*   **Telegram Bot Alerts 🚨**: Instantly dispatches a Telegram notification with a cropped photo of the vehicle and its scanned plate number upon detection.
*   **Wanted Watchlist**: Users can maintain a database of "Wanted" vehicles. If a match is detected, the system triggers a high-priority alarm through the Telegram Bot.
*   **Transparent Debug Mode**: Automatically saves intermediate clean OCR images to disk and explicitly logs the scoring logic in the terminal to help users debug false positives.
*   **Premium UI**: Dark-mode React dashboard with real-time polling, interactive violation logs, and a dedicated Wanted List manager.

---

## 🛠️ Technology Stack

*   **Frontend**: React, Tailwind CSS, Lucide Icons, Vite.
*   **Backend**: Python, FastAPI, SQLAlchemy, SQLite, `httpx` (Telegram API).
*   **AI/ML**: YOLOv8 (ONNX), EasyOCR, OpenCV, NumPy, CUDA.

---

## 🚦 Getting Started

### 1. Requirements
*   **Python 3.10+**
*   **Node.js 18+**
*   **NVIDIA GPU (Optional)**: For maximum performance, ensure CUDA 11.x/12.x and cuDNN are installed.

### 2. Installation & Launch

Open three separate terminals and run the following in order:

#### Terminal A: Backend Service (Port 8000)
> **Note:** Edit `TG_BOT_TOKEN` and `TG_CHAT_ID` inside `backend-service/main.py` (or inject via `.env`) to receive Telegram alerts!
```powershell
cd backend-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Terminal B: ML Service (Port 8001)
```powershell
cd ml-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# To enable GPU acceleration specifically:
pip uninstall onnxruntime -y
pip install onnxruntime-gpu
uvicorn main:app --reload --port 8001
```

#### Terminal C: Frontend Dashboard (Port 5174)
```powershell
cd frontend-dashboard
npm install
npm run dev -- --port 5174
```

---

## 📖 Usage

1.  **Dashboard**: Open [http://localhost:5174](http://localhost:5174) to see the live summary.
2.  **Process Media**: Go to the "Process Files" page in the sidebar to upload `.jpg`, `.png`, or `.mp4` files for analysis.
3.  **Logs**: View the "Violations Log" to see all recorded entries. Click on any row to view the full details and the vehicle photo.
4.  **Wanted List**: Use the "Wanted List" sidebar tab to add license plates you wish to actively monitor for high-priority Telegram alarms.

---

## 📡 API Endpoints (ML Service)

*   `POST /process-file`: Upload a file (Multipart form-data) for full detection.
*   `POST /process-violation`: Send a base64 frame for instant analysis.
*   `POST /process-violation/batch`: Seed the database with mock detections for testing.

---

## ⚠️ Notes
*   **License Plate Format**: The system is currently optimized for strictly **Latin alphabet** and numbers.
*   **Exclusion Zones**: Detections in the top/bottom 15% of the frame are ignored to avoid camera OSD overlap.
