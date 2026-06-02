# ana

A personal Sadhana journal for Sadhanapada participants. A digital companion to your physical practice journal — warm, still, contemplative.

**Not** a productivity app. No streaks, badges, points, or guilt metrics.

## Features

- **Tracker** — log daily practices with custom inputs (time, count, minutes, done toggle, icon scale)
- **Daily Reflection** — 7 contemplative prompts with voice input, symbol stamps, and mood slider
- **Weekly Reflection + Digest** — 9 prompts (including seva) + data-driven weekly summary with sparklines
- **Expressions** — freeform rich-text writing with Tiptap editor
- **Themes** — Contemplative Dark and Digital Parchment (light)
- **PWA** — installable, works offline with IndexedDB mutation queue
- **Custom time/number pickers** — no native browser UI, fully themed

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + CSS variables |
| Icons | @phosphor-icons/react (thin weight) |
| Motion | Framer Motion |
| Database | PostgreSQL (Neon) via Prisma v5 |
| State | TanStack React Query |
| Editor | Tiptap |
| Offline | idb-keyval + service worker |
| Deploy | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and AUTH_SECRET

# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on onboarding.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended) |
| `AUTH_SECRET` | Secret for session cookies |

## Build & Deploy

```bash
# Production build (includes prisma generate)
npm run build

# Start production server
npm start
```

Deployed on Vercel with auto-deploy on push to `main`.

## Project Structure

```
src/
├── app/
│   ├── (shell)/          # Pages with navigation (tracker, daily, weekly, etc.)
│   ├── onboarding/       # First-launch flow
│   └── api/              # Route handlers (days, daily, weekly, practices, etc.)
├── components/
│   ├── shell/            # Sidebar, MobileTabBar, Topbar
│   ├── tracker/          # PracticeRow, FieldInput, WeeklyTable, TimePicker
│   ├── reflection/       # PromptCard, MicButton, StampRow, MoodPicker
│   ├── weekly/           # Sparkline, TendedRow
│   ├── expressions/      # TiptapEditor
│   ├── ui/               # Toast, DatePicker, Skeleton, Loader
│   └── art/              # Lotus (logo)
├── lib/
│   ├── db.ts             # Prisma client
│   ├── session.ts        # User resolution from cookie
│   ├── queries.ts        # React Query hooks
│   ├── dates.ts          # Date utilities
│   ├── defaults.ts       # Default practice definitions
│   ├── digest.ts         # Digest template engine
│   └── offlineQueue.ts   # IndexedDB mutation queue
└── prisma/
    └── schema.prisma     # Database schema
```

## Design Principles

- The journal, alive — warm, still, contemplative
- No gamification, scores, or compliance metrics
- Template-based digest — no AI-generated text
- Offline-first — mutations queue in IndexedDB
- Every icon is Phosphor (thin weight) — no emojis
