# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Isha meditators and volunteers who keep a daily sadhana: practitioners at home, volunteers doing seva, and center residents. They use ana to log their practices, reflect daily and weekly, and keep moments from their life, especially moments with the people they know, so they can look back on them later instead of forgetting.

Admins are a small set of trusted people who approve new sign-ups and decide which features each person can reach.

## Product Purpose

A personal, contemplative sadhana journal: a digital companion to the physical practice journal. Success is a practitioner who returns daily without pressure, and who can open a person's page and see, dated and timed, the moments they have shared with that person.

## Positioning

A sadhana journal made for the Isha context, in Isha's own language and practices, that also works as a memory of people and moments. It is not tied to any single program (Sadhanapada or otherwise), and it is deliberately not a productivity or habit app.

## Operating Context

- Used equally on phone (installed PWA, quick logging and recording) and on desktop (longer writing, review).
- Daily ritual: log the day's practices and write a short daily reflection; weekly reflection at week end, which includes the seva intensity questions.
- Moments are captured when they happen, as text, audio, video or photo, then tagged with people and a date and time.
- Must work offline and sync when back online.

## Capabilities and Constraints

- Features: Tracker, Daily reflection, Weekly reflection (with seva questions and a digest), Expressions/Moments, People. Planned: Today home, practice library, Insights, reminders, My commitment (program-agnostic), search.
- Seva is part of Weekly, not a separate feature.
- Multi-user with Google sign-in. Anyone with a Google account can sign in and complete onboarding; an admin must approve them before use (to protect storage). Approval may be dropped later.
- Per-user features: the admin sets a ceiling, the user chooses within it during onboarding and in settings. Navigation and APIs follow the effective set.
- Audio is stored as audio only, with no transcription for now.
- Stack: Next.js (App Router), Postgres via Prisma, Tailwind v4, deployed on Vercel.

## Brand Commitments

- Name: "ana". Voice: warm, still, contemplative, never nagging.
- All users are under Isha's umbrella: Sadhguru's photo and signature, the daily Sadhguru quote, Isha practice names and imagery, and the Isha lotus/snake splash may be used.
- Reference app for assets and cues (not to clone): https://sadhana-pwa-demo-vercel.vercel.app
- Light (cream) appearance by default, with a user-togglable dark mode.

## Evidence on Hand

- `public/images/sadhguru-namaskar.jpg`, `public/splash/splash-lotus.webp`, `public/splash/splash-snake.webp`, `public/icons/logo.png`.
- The reference app has 45 practice images (`images/practices/*.webp`).
- No testimonials, usage numbers or endorsements exist; do not invent them.

## Product Principles

1. No streaks, badges, points or guilt metrics, ever. Patterns may be shown gently, never as scores.
2. Stillness over stimulation: every screen should feel calm and unhurried, with smooth, stable interactions.
3. Remembering people is as much a practice as the practices themselves.
4. Your data is yours: private by default, exportable, and it never leaves your account.
5. Capture must be fast on a phone; reflection must be comfortable on a desktop.
