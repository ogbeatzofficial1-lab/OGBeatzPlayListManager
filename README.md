# 🏗️ OG BEATZ Vault — Principal Systems Architect Blueprint

This document serves as the official **Technical Architecture Specification and System Blueprint** for the OG BEATZ Vault application. Designed for modularity, sub-millisecond audio playback responsivity, offline-first reliability, and clean separation of concerns, this system represents a modern high-fidelity CRM and media delivery platform.

---

## 💻 1. Architectural Philosophy & Technology Stack

The application is structured as a **Single Page Application (SPA)** utilizing a unidirectional data flow design pattern. A deep-dark cyberpunk industrial visual shell operates on top of highly reactive data models.

### Key Frameworks & Software Elements
*   **Core UI Runtime**: React 18+ (TypeScript Strict Mode enabled).
*   **Build Architecture & Bundling**: Vite.js utilizing fast module reloading (FMR) configuration.
*   **Hardware-Accelerated Animation Layer**: `motion` (`motion/react`) for fluid transitions, spring-based visual mechanics, list item entrances, and drawer actions.
*   **Vector Icon Matrix**: `lucide-react` for clean SVG vector scaling.
*   **Data Visualization Engine**: `recharts` for charting user analytics and tracking CRM transactions over rolling parameters.
*   **Styling Engine**: Tailwind CSS featuring modern `@import "tailwindcss";` configurations, customizable thematic system variables, and responsive layout prefixes.

### Architectural Patterns
*   **Unidirectional State-to-Storage (USS)**: The primary application state lives globally in high-level contexts and synchronizes to local namespaces on the viewport disk via robust storage interceptors.
*   **Functional Hook-Driven Audio Context (FHAC)**: Encapsulates hardware audio events in a unified class, providing immediate non-blocking actions.
*   **Deterministic Heuristics Engine (DHE)**: Resolves heavy ML-style content tagging entirely client-side, analyzing tokenized strings.

---

## 📂 2. Structural Structural Schema & Directory Trees

### Directory Tree Representation
```text
/ (Workspace Root)
├── package.json                    # Package manifest, metadata, and script directives
├── tsconfig.json                   # Strict TypeScript type resolution rules
├── vite.config.ts                  # Port 3000 mapping and development rules
├── README.md                       # Architectural specification file (This file)
└── src/
    ├── main.tsx                    # System entry point
    ├── index.css                   # Global styles importing Tailwind CSS variables
    ├── types.ts                    # Global contract and entity types
    ├── App.tsx                     # Top-level view router and user shell controller
    ├── components/                 # Component sub-modules
    │   ├── Shell.tsx               # Primary interface shell (navigation and state gauges)
    │   ├── AudioPlayer.tsx         # Persistent hardware media controller 
    │   ├── UploadZone.tsx          # Drag-and-drop file receiver
    │   ├── ShareModal.tsx          # Sharing generator & URL link creator
    │   ├── SharePortal.tsx         # External A&R public presentation page
    │   ├── ClientPortal.tsx        # Track-listing page for logged-in clients
    │   ├── PromoPackModal.tsx      # Multi-format automated text generators
    │   ├── VideoGenerationModal.tsx # Dynamic visual parameter compiler
    │   ├── VideoPreviewModal.tsx   # Simulates motion design layout previews
    │   ├── TrackOptionsMenu.tsx    # Context action menus for catalog entries
    │   ├── AddClientModal.tsx      # Multi-step CRM contact forms
    │   ├── EditClientModal.tsx     # Contact modification dialogs
    │   ├── EditPlaylistModal.tsx   # Collection descriptor updates
    │   ├── AddTrackToPlaylistModal.tsx # Association tools
    │   └── EditTrackModal.tsx      # Master metadata adjustments
    ├── context/                    # State managers
    │   ├── AudioContext.tsx        # Global HTML5 Audio state wrapper
    │   └── MediaStoreContext.tsx   # Catalog, Client Directory & Messaging DB Controller
    ├── services/                   # Service integrations
    │   └── geminiService.ts        # Modular client endpoint
    └── lib/                        # Infrastructure
        └── supabase.ts             # Conditional database connections
```

### Component Relationship Architecture
```text
                    [ App.tsx ] (Routing & Root Shell)
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
     [ Shell ]     [ SharePortal ] [ ClientPortal ]
         │
  ┌──────┴───────────────┬────────────────────────────┐
  ▼                      ▼                            ▼
[ Views ]        [ Modals / Dialogs ]          [ AudioPlayer ]
 - Dashboard      - UploadZone                  (Subscribes to AudioContext)
 - Tracks         - EditTrackModal / ShareModal
 - Playlists      - AddClientModal / EditClientModal
 - CRM            - PromoPackModal / VideoGenerationModal
 - Messaging      - AddTrackToPlaylistModal
 - Analytics
```

---

## ⚙️ 3. Core Features & Functional Logic Flow

### A. Non-Blocking Audio Playback Pipeline
The audio framework ensures zero playback latency and continuous play state across virtual routes.

```text
User Actions ──> [ AudioContext commands ] ──> [ Instantiates HTML5 Audio ]
                       │                              │
                       ▼                              ▼
             Sets Current Track Data        Drives Progress Counters
             Triggers Activity Log          Updates Playback Statuses
```
*   **Volume Preserves**: Read/write events on client state files maintain selected volume percentages.
*   **Waveform Synthesizer simulation**: Draws an custom active visual stream mapped directly to current time codes.

### B. Heuristic Track Parsing (DHE Engine)
When a file is loaded, it flows through a sequential regex scanner:
1.  **Stage 1: Extension Truncation**: `.mp3`/`.wav`/`.flac` extensions are removed.
2.  **Stage 2: Tempo (BPM) Extraction**:
    `const bpmMatch = cleanLower.match(/(\d{2,3})\s*(?:bpm|BPM)/);`
    Matches speed values between 60 and 200.
3.  **Stage 3: Key Signature Match**: Matches strings against a sorted array of structural notes (`C#m`, `Am`, `G`) descending by character length to prevent partial matches (e.g., matching "F" in "F#m").
4.  **Stage 4: Semantic Genre Mapping**: Tests the presence of lower-case strings to associate mood tags automatically:
    *   `lofi`, `study`, `chillhop` -> Categorized as `Lofi`, `Chill`, `Relaxed`
    *   `trap`, `808` -> Categorized as `Trap`, `Dark`, `Heavy`
    *   `drill`, `grime` -> Categorized as `Drill`, `Aggressive`, `Gritty`

### C. Unified Secure Sharing Model (A&R Share Portal)
Securing music distributions without complex authentication tokens is resolved using a stateless tokenized gateway:

```text
[ Producer Dashboard ] ──> Generates Hash Token ──> Distributes Custom Link
                                                         │
                                                         ▼
[ A&R Direct Play / Downloads ] ◄── Validates Expiry ◄── [ Loads SharePortal ]
```
*   **Heuristic Expiration**: Time-based expiry timestamps are checked on layout injection.
*   **Direct Feedback Channel**: VIP visitors can send immediate comments or licensing queries back to the internal messaging queue of the producer.

### D. Multi-Format Corporate Importer
The CRM client registry handles importing CSV data securely:
*   **Header Resolution Mapping**: Matches standard headers (`Name`, `Email`, `Company`, `Status`) across custom columns.
*   **Status Assignment**: Missing status fields default to `offline` with active timestamps.

---

## 🔒 4. System Constraints & Dependencies

*   **Offline Fallback Mode**: If database connections block or are absent, the application gracefully routes all operations to the highly optimized fallback memory layer, ensuring 100% uptime with no terminal crashes.
*   **Thread Safety in Client Memory**: Sequential writes serialize synchronously to `localStorage` partitions to prevent state corruption during rapid operations.
*   **Sound Format Scope**: Audio HTML5 decoders support standard bitrates of `audio/mpeg` (mp3) and standard reference types (`audio/wav`, `audio/aac`).

---

## 🚀 5. Quick Start & Deployment Guide

Follow these steps to initialize and run this exact system from a bare-metal terminal.

For the **Complete Production compilation, environment configurations, and detailed step-by-step instructions for hosting the compiled system on InfinityFree with `.htaccess` URL rewrites**, please refer to our dedicated [**Deployment & InfinityFree Hosting Guide (DEPLOYMENT_GUIDE.md)**](./DEPLOYMENT_GUIDE.md).

### Step 1: System Initialization
```bash
# Create and move into workspace directory
mkdir ogbeatz-vault && cd ogbeatz-vault

# Start a new Vite React application
npm create vite@latest . -- --template react-ts

# Install required dependencies
npm install lucide-react recharts motion
```

### Step 2: Establish Style Sheets
Create or edit your global CSS file `/src/index.css` to import and apply custom Tailwind themes:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}
```

### Step 3: Integrate Core Modules
Deploy types to `/src/types.ts` and set up state managers in `/src/context/` matching your specifications. Assemble your views inside `/src/components/` and load `/src/App.tsx`.

### Step 4: Boot local server
```bash
# Clean cache files and launch dev environment
npm run dev -- --host 0.0.0.0 --port 3000
```
Your high-fidelity industrial console will successfully compile on port 3000!
