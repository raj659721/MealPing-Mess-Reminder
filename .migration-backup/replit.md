# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Supabase (PostgreSQL via HTTP/JS client — no migrations, service key bypasses RLS)
- **Auth**: Clerk (frontend + backend middleware)
- **Validation**: Zod via OpenAPI codegen
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui + Wouter

## Project: Smart Mess Manager

A production-level hostel/college mess tracking web app.

### Features

- Daily lunch/dinner attendance marking with meal time awareness
- छुट्टी (holiday) marking — skips both meals for a day
- Interactive calendar — click any past day to edit meals inline
- Smart Insights card: pattern detection, bill prediction, "same as yesterday"
- Missed meal alerts — pulsing red badge if meal time passed and not marked
- Monthly summary with money saved calculation
- Weekly snapshot chart
- Analytics page with charts
- Range tracker for arbitrary date ranges
- History page with CSV + PDF export
- Admin Panel (`/admin`) — role-based, controlled by `ADMIN_USER_IDS` env var
- Advanced notifications: sound (Web Audio API) + vibration + snooze (5 min)
- PWA manifest + service worker (`/sw.js`) for offline support
- Dark mode
- Marathi UI throughout

### Architecture

- `artifacts/mess-tracker` — React + Vite frontend (Tailwind v4, shadcn/ui, Wouter)
- `artifacts/api-server` — Express 5 backend (Clerk auth, Supabase client)
- `lib/api-spec` — OpenAPI spec → Orval codegen → `lib/api-client-react` (React Query hooks) + `lib/api-zod` (Zod schemas)

### Frontend Pages

- `/` — Landing page (public)
- `/sign-in`, `/sign-up` — Clerk auth
- `/dashboard` — Today card + Smart Insights + Weekly/Monthly summary + Interactive Calendar
- `/analytics` — Charts (weekly pattern, meal consistency)
- `/range` — Custom date range tracker
- `/history` — Month browser with inline edit + CSV/PDF export
- `/settings` — Cost/meal, reminder toggles, custom meal times
- `/admin` — Admin dashboard (403 for non-admins)

### Admin Panel Setup

Set the Replit secret `ADMIN_USER_IDS` to a comma-separated list of Clerk user IDs.
Example: `user_2abc123,user_2xyz789`
Then restart the API server. Admin users see an "Admin" badge in the nav and can access `/admin`.

Admin features:
- Overview stats (total users, today's meals, monthly revenue)
- Daily report — view/toggle any user's meals for any date, export CSV
- Users table — per-user monthly stats with attendance rate, export CSV

### API Routes

- `GET/POST /api/entries` — list/upsert user's entries
- `GET /api/entries/today` — today's entry
- `GET /api/entries/:date` — entry by date
- `GET /api/summary` — monthly summary
- `GET/PUT /api/settings` — user settings
- `GET /api/admin/overview` — admin: total users/meals/revenue
- `GET /api/admin/daily?date=` — admin: all users' entries for a date
- `GET /api/admin/users?year=&month=` — admin: per-user monthly stats
- `POST /api/admin/entries` — admin: mark meal for any user

### Supabase Tables

- `mess_entries` (id, user_id, date, lunch_taken, dinner_taken, lunch_present, dinner_present, notes, created_at, updated_at)
- `user_settings` (id, user_id, meal_cost_per_meal, lunch_reminder_enabled, dinner_reminder_enabled, created_at, updated_at)

### Key localStorage Keys

- `mess_meal_times_v1` — custom lunch/dinner times (HH:MM)
- `mess_reminder_v2` — today's reminder active/acknowledged state
- `mess_reminder_snooze_v1` — snooze end timestamps for lunch/dinner

### Environment Secrets

- `SUPABASE_SERVICE_KEY` — Supabase service role key (bypasses RLS)
- `SUPABASE_DATABASE_URL` — Supabase connection URL
- `SESSION_SECRET` — Express session secret
- `ADMIN_USER_IDS` — comma-separated Clerk user IDs for admin access
- `PINGRAM_API_KEY`, `PINGRAM_CLIENT_SECRET` — push notification keys

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI spec
- `pnpm --filter @workspace/mess-tracker exec tsc --noEmit` — typecheck frontend only
- `pnpm --filter @workspace/api-server exec tsc --noEmit` — typecheck API server only
