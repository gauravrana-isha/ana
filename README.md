# ana

A personal Sadhana journal for Sadhanapada participants. A digital companion to your physical practice journal — warm, still, contemplative.

**Not** a productivity app. No streaks, badges, points, or guilt metrics.

## Features

- **Google sign-in + approval** — anyone with a Google account can sign in and finish onboarding; an admin approves them before they can use the app
- **Per-user sections** — admins set what each person may use; each person turns sections on/off within that. Navigation and APIs follow the result
- **Tracker** — log daily practices with custom inputs (time, count, minutes, done toggle, icon scale), with Isha practice illustrations
- **Daily Reflection** — contemplative prompts with symbol stamps and a mood slider
- **Weekly Reflection + Digest** — 9 prompts (including seva) and a data-driven weekly summary
- **Expressions** — freeform rich-text writing (audio, video and people are next)
- **Themes** — cream journal (light, default) and night journal (dark), switchable in Settings
- **PWA** — installable, works offline with an IndexedDB mutation queue, Isha splash on launch

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

Open [http://localhost:3000](http://localhost:3000) — sign in with Google, then onboarding.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended) |
| `AUTH_SECRET` | Auth.js secret (`npx auth secret`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client. Redirect URI: `<app-url>/api/auth/callback/google` |
| `ADMIN_EMAILS` | Comma-separated emails that become approved admins on first sign-in |

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

