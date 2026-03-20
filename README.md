# Sitezy — AI Website Builder

> Describe your website. Sitezy generates a unique, multi-page site using Claude AI.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Zustand**, and the **Anthropic Claude API**.

---

## Features

- **AI-powered generation** — Full multi-page website from a natural language prompt
- **Blueprint-first pipeline** — Site architecture, color system, and typography planned before code generation
- **Structurally unique sites** — Varies layouts: editorial, bento, asymmetric, split-screen, zigzag, and more
- **Live preview** — Sandboxed iframe preview with device switching (desktop/tablet/mobile)
- **Code editor** — Edit generated HTML directly with live sync
- **AI chat assistant** — Context-aware Claude assistant in the editor sidebar
- **Export as ZIP** — Download a complete, runnable multi-file website
- **Full preview mode** — Isolated full-screen preview with page navigation
- **Undo / Redo** — Non-destructive editing history
- **Secure API** — All Claude calls go through Next.js route handlers — API key never exposed to browser

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd sitezy
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Get your API key at [console.anthropic.com](https://console.anthropic.com).

### 3. Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── blueprint/route.ts    # Generate site blueprint
│   │   ├── generate/route.ts     # Generate individual pages
│   │   ├── assist/route.ts       # AI chat assistant (streaming)
│   │   └── export/route.ts       # Export project as ZIP
│   ├── page.tsx                  # Root page
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── AppShell.tsx              # Dashboard ↔ Editor router
│   ├── dashboard/
│   │   ├── Dashboard.tsx
│   │   ├── ProjectCard.tsx
│   │   └── CreateProjectModal.tsx
│   └── editor/
│       ├── Editor.tsx
│       ├── EditorTopBar.tsx
│       ├── LeftSidebar.tsx       # Pages, files, blueprint
│       ├── PreviewCanvas.tsx     # Preview + code editor
│       ├── RightSidebar.tsx      # AI chat, properties, blocks
│       └── FullPreviewModal.tsx
├── lib/
│   ├── ai/service.ts             # All Claude API calls (server-only)
│   ├── store/index.ts            # Zustand store
│   └── utils/index.ts
└── types/index.ts
```

---

## Generation Pipeline

```
User Brief
    ↓
POST /api/blueprint  →  Site architecture, colors, typography, page map
    ↓
POST /api/generate   →  Per-page HTML (one request per page, parallel possible)
    ↓
Editor opens with    →  Live preview, code editor, AI assistant
    ↓
POST /api/export     →  ZIP with full HTML files + CSS + README
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/blueprint` | POST | Generate site blueprint from brief |
| `/api/generate` | POST | Generate a single page (streaming supported) |
| `/api/assist` | POST | AI chat assistant (SSE streaming) |
| `/api/export` | POST | Export project as ZIP download |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `ANTHROPIC_MODEL` | ✅ | Model to use (e.g. `claude-sonnet-4-20250514`) |
| `NEXT_PUBLIC_APP_URL` | ❌ | Public URL (for production) |

---

## Tech Stack

- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS**
- **Zustand** (with `immer` + `persist`)
- **Anthropic SDK** (`@anthropic-ai/sdk`)
- **JSZip** (ZIP export)
- **Lucide React** (icons)
- **Framer Motion** (animations)

---

## Production Deployment

```bash
npm run build
npm start
```

Or deploy to **Vercel** — set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in your project's Environment Variables.

---

*Built with [Sitezy](https://sitezy.app) · Powered by Claude*
