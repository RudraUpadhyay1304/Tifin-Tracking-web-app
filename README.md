# Tiffin Manager 🍱

A smart, mobile-first PWA for a single-owner Indian tiffin business.
Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS + Supabase**,
with a **Gemini-powered AI assistant** and automatic **Google Sheets backup**.

100% free stack. Made for one person using an Android phone.

## Features

- **Dashboard** — today's earnings, monthly earnings, pending payments, upcoming holidays, big quick-action buttons
- **Customers** — add / edit / delete / search, per-customer profile with notes
- **Monthly calendar** — tap any day to change status (delivered / skipped / extra / holiday / sunday off); billing updates automatically
- **Sunday Off automation** — one toggle in Settings; Sundays are auto-marked and excluded from billing
- **Holidays & pauses** — global holidays or per-customer pauses, excluded from billing
- **Weekly menu planner**
- **Payments & Finance** — income charts (daily + monthly trend), pending list, CSV/Excel export
- **Data Center** — spreadsheet-style view with tabs: Customers, Calendar (daily register), Payments, Menu, Analytics; sort, filter, inline edit, export
- **AI Assistant** — natural language: “How much did I earn this month?”, “Add Rahul Sharma with ₹3000 monthly charge”, “Pause Anjali from 10 Aug to 15 Aug”… Writes always ask for confirmation first
- **PWA** — installable on Android, splash screen, icon, offline shell, fast on slow networks
- **English + Hindi** — instant switcher in Settings

## Tech stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, TS, Tailwind v4 |
| Backend    | Supabase (PostgreSQL, server-side only) |
| AI         | Google Gemini (function calling)        |
| Backup     | Google Sheets via Apps Script (read-only mirror) |
| Hosting    | GitHub → Vercel (auto-deploy)           |

## Setup (15 minutes)

### 1. Supabase (database)

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), run it
3. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Gemini (AI assistant)

1. Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Copy it → `GEMINI_API_KEY`

### 3. Environment

Copy `.env.example` to `.env.local` (local dev) and set the same variables in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
```

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Deploy (free, auto-redeploy on push)

1. Push this repo to GitHub
2. On [vercel.com](https://vercel.com): **Add New → Project → import the GitHub repo**
3. Add the environment variables above in Vercel → Project → Settings → Environment Variables
4. Deploy. Every future `git push` redeploys automatically

### 6. Install on your phone

Open the deployed URL in Chrome on Android → menu (⋮) → **Add to Home screen**.
It opens like a native app with an icon and splash screen.

## Google Sheets backup (optional, free)

1. Create a Google Spreadsheet (“Tiffin Backup”)
2. **Extensions → Apps Script** → paste [`supabase/sheets-mirror.gs`](supabase/sheets-mirror.gs)
3. Deploy → **New deployment → Web app** → *Execute as: Me*, *Access: Anyone*
4. Copy the Web app URL into `SHEETS_WEBHOOK_URL`
5. The app pushes nightly backups to Sheets via Vercel Cron (`vercel.json`). Sheets is a read-only mirror — the app never reads from it, so it never slows the app down.

## Billing logic

- Daily rate = `monthly charge ÷ (days in month − Sundays − global holidays − pauses)`
- Due for the month = `daily rate × (delivered days + extra meals)`
- Pending = `due − payments recorded this month` (shown per customer and on the dashboard)

## Project structure

```
src/
  app/                  # Pages (App Router)
    dashboard/          # Home with quick actions
    customers/          # List + profile with monthly calendar
    payments/ menu/ finance/ holidays/ search/
    datacenter/         # Spreadsheet-style Data Center (5 tabs)
    settings/           # Language, dark mode, Sunday off
    ai/                 # AI assistant page
    api/search/         # Global search endpoint
    api/sync/sheets/    # Nightly backup webhook
  components/           # Reusable UI (buttons, forms, calendar, charts, chat)
  lib/
    i18n/               # English + Hindi dictionaries
    server/             # Supabase client, data layer, server actions
    server/ai/          # Gemini function-calling tools
    billing.ts          # Billing engine (single source of truth)
    utils.ts            # Dates, currency, CSV/Excel export
  types/db.ts           # Database row types
supabase/
  schema.sql            # Run once in Supabase SQL Editor
  sheets-mirror.gs      # Apps Script for Google Sheets backup
```

## Security notes

- All database access happens server-side with the Supabase **service_role** key (never exposed to the browser)
- **RLS is enabled** on every table with no public policies — the database can only be touched by the server
- All mutations validate input with **zod**; the AI executes the same validated paths
- The backup webhook is protected with an optional `CRON_SECRET`

## Development commands

```bash
npm run dev     # local dev server
npm run build   # production build (type-check + compile)
npm run lint    # eslint
```
