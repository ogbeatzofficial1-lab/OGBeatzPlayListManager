# 🏗️ OG BEATZ Vault — Principal Technical Blueprint & Operations Manual

This document serves as the official **Production Architecture Specification, Integration Manual, and System Blueprint** for the OG BEATZ Vault application. Built on a modernized full-stack framework pairing a React 18 / Vite frontend with an Express.js backend, this platform handles catalog curation, sub-millisecond hardware-accelerated audio processing, CRM contact operations, secure link generation, and background-queued AI video de-watermarking/inpainting pipelines.

---

## 💻 1. Technology Stack & Core Architecture

The system transitions seamlessly between a reactive, offline-first React Single Page Application (SPA) and an Express.js server-side controller, designed for resilience, uptime, and thread-isolated asynchronous workflows.

### Front-End Infrastructure
*   **Core UI Engine**: React 18+ (strictly written in TypeScript-compliant syntax).
*   **Build Architecture**: Vite.js utilizing decoupled hot-rebuild capabilities.
*   **Animation System**: `motion` (`motion/react`) driving elastic animations, high-fashion modal slide-ins, and page transition frames.
*   **Design & Layout**: Tailwind CSS powered by pure theme configurations and deep obsidian black accents (`#020617`, `#09090b`).
*   **Data Visualization**: `recharts` powering custom-drawn SVGs to monitor real-time CRM performance, discovery metrics, and active background video engine logs.

### Back-End System Logic
*   **Runtime Host**: Node.js utilizing Express.js for fast route mapping and REST API handshakes.
*   **File Transfer Interceptors**: `multer` handling memory buffers securely for standard files.
*   **Background Worker Queue**: Thread-isolated async pipeline controller for heavy cloud computational requests (e.g., GhostCut API interactions, image rendering) to keep API server response times below 200ms.

---

## 📂 2. Structured Directory Trees

```text
/ (Workspace Root)
├── package.json                    # Dependencies, compiled scripts, and entry definitions
├── tsconfig.json                   # Strict TypeScript type declaration overrides
├── vite.config.ts                  # Development dev-server ingress mappings
├── server.ts                       # Dual Express.js production runtime and development proxy
├── .env.example                    # Clean declaration template for environment secrets
├── README.md                       # Architecture layout and operational guide (This file)
└── src/
    ├── main.tsx                    # Native React entry point
    ├── index.css                   # Global styles incorporating Tailwind CSS theme configurations
    ├── types.ts                    # Declared typings and entity structures
    ├── App.tsx                     # Frame routing system and root context distributor
    ├── components/                 # Extracted UI component files
    │   ├── Shell.tsx               # Primary interface shell (navigation and state gauges)
    │   ├── AudioPlayer.tsx         # Persistent hardware media controller
    │   ├── WatermarkRemover.tsx    # Video cleanser frontend featuring the Recharts inpainting tracker
    │   └── YouTubeHub.tsx          # CRM discovery tracking dashboards
    ├── context/                    # State managers
    │   ├── AudioContext.tsx        # Audio hardware tracking
    │   └── MediaStoreContext.tsx   # Local storage and cloud database synchronization hooks
    └── services/                   # Outer integrations
        └── geminiService.ts        # Gemini SDK interfaces
```

---

## ⚙️ 3. Core Feature Specifications

### A. Non-Blocking Audio Playback Pipeline
*   Hardware-accelerated media rendering through customized `AudioContext` states. 
*   Prevents application freezes by isolating volume memory arrays, auto-resolving broken paths, and keeping track states stable across page updates.

### B. Heuristic Track Parsing (DHE Engine)
When a file is loaded, it flows through a sequential regex scanner inside the client state:
1.  **Stage 1: Extension Truncation**: `.mp3`/`.wav`/`.flac` extensions are removed.
2.  **Stage 2: Tempo (BPM) Extraction**: Matches values between 60 and 200 (e.g., `140BPM`).
3.  **Stage 3: Key Signature Match**: Matches strings against a sorted array of structural notes (`C#m`, `Am`, `G`) descending by character length to prevent partial matches (e.g., matching "F" in "F#m").
4.  **Stage 4: Semantic Genre Mapping**: Tests the presence of lower-case strings to associate mood tags automatically:
    *   `lofi`, `study`, `chillhop` -> Categorized as `Lofi`, `Chill`, `Relaxed`
    *   `trap`, `808` -> Categorized as `Trap`, `Dark`, `Heavy`
    *   `drill`, `grime` -> Categorized as `Drill`, `Aggressive`, `Gritty`

### C. GhostCut AI Inpainting & De-Watermarking Pipeline
An high-precision video editing engine integrated into the interface. For large videos requiring massive cloud execution, the system employs two specialized execution patterns:

1.  **Direct Polling Task Integration** (`/api/ghostcut/submit-task`):
    Allows live client-side progress listening. When active, it displays a low-latency **Recharts visual simulation running on the client GPU**, exposing rolling live stats (Pixel Cleanse Index, GPU Thread Load in FPS, and Compression Residuals) synced to the rendering process.
2.  **Lightweight Multi-Threaded Queue Event** (`/api/submit-task`):
    Responds immediately back to calling clusters under 200 milliseconds to avoid server gateway timeouts, running the underlying GhostCut client requests within an isolated background thread.

---

## 📡 4. REST Backend API Specification

To prevent exposing secure vendor tokens (such as `GHOSTCUT_API_KEY`) to front-end inspection screens, all external requests are redirected through the Express.js route proxies:

### 📥 POST `/api/ghostcut/submit-task`
*   **Description**: Submits video URLs and coordinates of watermarks directly to GhostCut.
*   **Payload Format**: Form-Data or JSON encoding.
*   **Request Parameters**:
    ```json
    {
      "video_url": "https://example.com/source.mp4",
      "mode": "remove_watermark",
      "rect_array": "[{\"x\":10, \"y\":10, \"width\":100, \"height\":50}]",
      "inpainting": "true"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "status": "success",
      "task_id": "gc_task_908127389"
    }
    ```

### 📥 POST `/api/submit-task` (High-Velocity Background Thread Trigger)
*   **Description**: Registers processing jobs and triggers background workers asynchronously. Returns immediately to prevent HTTP Render gateway timeouts.
*   **Payload Format**: JSON encoding.
*   **Request Parameters**:
    ```json
    {
      "video_url": "https://example.com/source.mp4",
      "rect_array": [],
      "mode": "video_crop",
      "inpainting": false
    }
    ```
*   **Response (202 Accepted)**:
    ```json
    {
      "status": "queued",
      "message": "Processing task successfully registered with the cloud cluster.",
      "task_id": "task_1718413248834"
    }
    ```

### 🔍 GET `/api/ghostcut/check-task`
*   **Description**: Polls state queues using specific unique IDs.
*   **Query Parameters**: `?task_id=gc_task_908127389`
*   **Response (200 OK)**:
    ```json
    {
      "status": "completed",
      "progress": 100,
      "video_url": "https://processed-output-storage.com/output.mp4"
    }
    ```

---

## 🔒 5. Environment Variables Configuration

Create a `.env` file in the root directory. To run this system correctly, specify your credentials as shown below:

```env
# Application Runtime Configuration
NODE_ENV=production
PORT=3000

# GhostCut Cloud Compilers
GHOSTCUT_API_KEY=your_ghostcut_token_here
WATERMARK_ERASER_API_KEY=your_backup_token_here
GHOSTCUT_PROVIDER=rapidapi # Or "direct" for JollyToday Core

# Google Developer Console Credentials (YouTube Integrations)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

---

## 🚀 6. Local Operations & Development

Execute the following commands from your host device terminal to bootstrap, install, inspect, and run the server instance:

### Dependency Installation
```bash
# Pull all packages declared in the system package manifest
npm install
```

### Run Server in Development Mode
Auto-transpile and link local Vite assets to the Express middleware on port 3000:
```bash
npm run dev
```

### Production Package Compilation
Compile front-end TS concepts to fully static minified assets in `/dist`, and bundle backend dependencies with `esbuild` into `/dist/server.cjs`:
```bash
npm run build
```

---

## ☁️ 7. Render Deployment Blueprint

To host this application in a live production environment on **Render.com**, configure a new **Web Service** with the following system properties:

1.  **Environment**: `Node`
2.  **Region**: Choose your nearest latency zone (e.g., `Oregon (US West)` or `Frankfurt (EU)`)
3.  **Branch**: `main`
4.  **Build Command**:
    ```bash
    npm install && npm run build
    ```
5.  **Start Command**:
    ```bash
    npm run start
    ```
6.  **Advanced Options / Environment Variables**:
    *   Add your `GHOSTCUT_API_KEY` or `WATERMARK_ERASER_API_KEY`.
    *   Set `PORT` to database-isolated or automated variables (Render supplies this dynamically, which is read by `process.env.PORT` in our server setup).
    *   Set `NODE_ENV` to `production`.

---
*Principal Systems Architecture Manual — Persisted in the Repository Root.*
