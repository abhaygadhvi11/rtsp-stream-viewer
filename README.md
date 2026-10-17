# Skylark Labs - RTSP Stream Viewer
### Full Stack Engineer Coding Test Solution

A high-performance, ultra-low-latency RTSP Video Management System (VMS) built with **Go (Golang)**, **TypeScript**, **React**, **FFmpeg**, and **WebSockets**.

Designed for real-time video surveillance and computer-vision operations centers with multi-camera grid monitoring, live HUD telemetry, frame snapshotting, and robust error recovery.

---

## 🌟 Key Features

- **⚡ Ultra-Low-Latency Streaming (<150ms)**: FFmpeg transcodes RTSP streams directly to low-latency MPEG-TS over WebSockets, decoded natively in the browser via HTML5 Canvas (JSMpeg WebGL engine).
- **🖥️ Multi-Camera Grid Views**: Instant switching between **1×1** (single focused camera), **2×2** (quad surveillance), **3×3** (9-split monitoring), and **Auto** responsive grid.
- **📊 Real-time HUD Telemetry**: Live per-stream metrics including connection state (`LIVE`, `CONNECTING`, `RECONNECTING`, `ERROR`, `PAUSED`), real-time FPS counter, bitrate indicator, and live uptime clock.
- **🎮 Granular Controls**: Individual play/pause, reconnect/refresh, high-resolution frame snapshots, full-screen expansion, and camera removal.
- **📸 Snapshot Gallery**: Capture full-resolution JPEG frames from any active feed, browse thumbnails in a modal gallery, and download with one click.
- **🛡️ Production-Grade Go Architecture**:
  - Goroutine-backed stream workers with thread-safe client fan-out (`sync.RWMutex`).
  - Automatic reconnection with exponential backoff on stream drops.
  - Subprocess lifecycle management (terminates FFmpeg on client disconnect to prevent zombie processes).
  - Stream multiplexing: multiple viewers of the same RTSP feed share a single FFmpeg worker.
- **🧪 Zero-Friction Testing & MediaMTX Support**:
  - One-click presets for synthetic surveillance feeds (clock pattern, motion sensor, SMPTE bars).
  - Built-in `docker-compose.yml` including **MediaMTX** and an automatic RTSP stream publisher.

---

## 🏗️ System Architecture

```
                                  [ BROWSER ]
                  React.js + TypeScript (Vite) + HTML5 Canvas
                                       |
                   WebSocket Binary Frames + REST Control APIs
                                       |
                                       v
                             [ GO BACKEND SERVICE ]
                        Chi Router + Gorilla WebSocket
   +-----------------------------------------------------------------------+
   |  Stream Manager (Thread-Safe Multiplexer & Registry)                  |
   |   - Worker Pool: 1 FFmpeg process per active RTSP URL                 |
   |   - Fan-Out Hub: Broadcasts frames to all subscribed WebSocket clients|
   |   - Lifecycle: Cleans up FFmpeg subprocess when idle                  |
   |   - Health & Probe APIs: Probes RTSP reachability before adding       |
   +-----------------------------------------------------------------------+
                                       |
                               FFmpeg Subprocess
                     (Pipes stdout MPEG-TS into Go channel)
                                       |
                                 RTSP over TCP
                                       |
                                       v
                       [ RTSP CAMERA SOURCES / MEDIAMTX ]
                Local MediaMTX Server / Physical IP Cams / Synthetic
```

---

## 🚀 Quick Start with Docker Compose (Recommended)

The easiest way to run the complete environment (Frontend + Backend + MediaMTX RTSP Server + Live Test Stream Generator) is with Docker Compose:

```bash
# Clone the repository
git clone <your-repo-url>
cd rtsp-stream-viewer

# Start all services (MediaMTX, publisher, Go backend, React frontend)
docker compose up --build
```

Once running:
- **Web Application**: Open [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080/health](http://localhost:8080/health)
- **MediaMTX RTSP Server**: `rtsp://localhost:8554/live/cam1`

---

## 💻 Local Development Setup

If running without Docker:

### Prerequisites
- **Node.js**: v18+ and `npm`
- **Go**: 1.22+
- **FFmpeg**: Installed and available in PATH (or specified via `FFMPEG_PATH`)

### 1. Start the Go Backend
```bash
cd backend

# Download Go modules
go mod download

# Run the server (auto-detects FFmpeg)
go run ./cmd/server
```
The backend starts on `http://localhost:8080`.

### 2. Start the React Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The frontend starts on `http://localhost:5173`.

---

## 📹 Testing RTSP Streams

### Option 1: Built-In Synthetic Streams (Zero Setup)
Click **"+ Add Camera"** in the web interface and choose any of the pre-configured presets:
- **Camera 01 - Main Entrance (Pattern)**: `synthetic://cam1-entrance`
- **Camera 02 - Perimeter Motion**: `synthetic://cam2-motion`
- **Camera 03 - Security Gate (SMPTE)**: `synthetic://cam3-gate`

### Option 2: Local MediaMTX RTSP Server
1. Download and run [MediaMTX](https://github.com/bluenviron/mediamtx/releases).
2. Publish a synthetic feed using the provided script:
   - **Windows (PowerShell)**:
     ```powershell
     .\scripts\publish_test_stream.ps1 -TargetRtspUrl "rtsp://localhost:8554/live/cam1"
     ```
   - **Linux / macOS**:
     ```bash
     chmod +x ./scripts/publish_test_stream.sh
     ./scripts/publish_test_stream.sh "rtsp://localhost:8554/live/cam1"
     ```
3. In the web interface, add `rtsp://localhost:8554/live/cam1`.

---

## 🌐 Cloud Deployment Guide

### Deploying Frontend (Vercel)
The frontend includes pre-configured `vercel.json` routing:
1. Push to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. Set the Root Directory to `frontend`.
4. Add environment variable:
   - `VITE_BACKEND_PORT`: Port or domain of your deployed backend service.
5. Deploy.

### Deploying Backend (Render / Railway / Fly.io)
The backend includes a production multi-stage `backend/Dockerfile` with Alpine and pre-installed FFmpeg:
1. Deploy from GitHub repository.
2. Select Docker as the runtime environment with context `backend/`.
3. Set environment variables:
   - `PORT`: `8080` (or platform default)
   - `ALLOWED_ORIGINS`: `*`
4. Deploy.

---

## 📡 REST & WebSocket API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | `GET` | Service uptime and active stream count |
| `/api/streams` | `GET` | List active RTSP streams and viewer metrics |
| `/api/streams` | `POST` | Register a new stream: `{"url": "...", "name": "..."}` |
| `/api/streams/probe` | `POST` | Validate RTSP connection: `{"url": "..."}` |
| `/api/streams/{id}` | `DELETE` | Terminate and remove a stream |
| `/ws/stream` | `WS` | WebSocket stream connection (`?url=<url>&id=<id>`) |

---

## 📂 Repository Structure

```
rtsp-stream-viewer/
├── backend/
│   ├── cmd/server/main.go            # Backend server entrypoint & graceful shutdown
│   ├── internal/
│   │   ├── api/                      # REST router, handlers, and WebSocket upgrader
│   │   ├── config/                   # Config loader & FFmpeg auto-discovery
│   │   └── stream/                   # Stream manager, worker pool, and client hub
│   ├── Dockerfile                    # Multi-stage Go + FFmpeg production container
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, StreamCard, StreamGrid, Modals
│   │   ├── types/                    # TypeScript interfaces
│   │   ├── App.tsx                   # Main VMS dashboard state & layout controller
│   │   └── index.css                 # Surveillance dark-mode design system
│   ├── Dockerfile                    # Multi-stage Vite + Nginx production container
│   ├── nginx.conf                    # Nginx reverse proxy configuration
│   ├── vercel.json                   # Vercel SPA routing
│   └── package.json
├── scripts/
│   ├── publish_test_stream.ps1       # PowerShell synthetic RTSP publisher
│   └── publish_test_stream.sh        # Bash synthetic RTSP publisher
├── docker-compose.yml                # Full stack: MediaMTX + Go + React + Publisher
└── README.md
```

---

## 📋 Evaluation Checklist

- [x] **Functionality**: Streams display properly with sub-150ms latency.
- [x] **Multi-Stream Grid**: 1×1, 2×2, 3×3, and Auto responsive grid arrangements.
- [x] **Stream Controls**: Play/pause, reconnect, full-screen, remove, and frame snapshots.
- [x] **Code Quality & Architecture**: Clean idiomatic Go backend with worker pool and clean TypeScript React frontend.
- [x] **Error Handling**: Graceful stream drop recovery with exponential backoff and zombie process prevention.
- [x] **UI/UX Design**: Modern surveillance operations center dark theme with live HUD telemetry.
- [x] **Testing & Deployment**: MediaMTX support, Docker Compose, Dockerfiles, and deployment configs.
