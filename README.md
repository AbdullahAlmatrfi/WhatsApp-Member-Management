# GymConnect

GymConnect is a small web app for gym reception staff. It stores members (name and phone number), lets staff search them, and sends a WhatsApp text message to selected members one click at a time using WhatsApp's click-to-chat links (the app opens the chat with the message pre-filled; staff press Send in WhatsApp). It is bilingual (English and Arabic, with full right-to-left layout), supports light and dark themes, and is built for a Saudi gym. Logins are created by an admin; there is no public sign-up. Members are removed automatically after a set time (default 72 hours).

## Tech stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, Geist font
- Supabase: Postgres, Auth, Row Level Security (RLS), and pg_cron for the auto-delete job
- Hosting: Netlify (using `@netlify/plugin-nextjs`)

## Quick start (local development)

You need Node.js 20 or newer, [pnpm](https://pnpm.io), and a Supabase project that has already had the database set up (see [docs/SETUP-AND-DEPLOY.md](docs/SETUP-AND-DEPLOY.md), Part 1).

```bash
git clone https://github.com/AbdullahAlmatrfi/WhatsApp-Member-Management.git
cd WhatsApp-Member-Management
pnpm install
cp .env.local.example .env.local
# Open .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# (Supabase dashboard -> Project Settings -> API)
pnpm dev
```

Then open http://localhost:3000.

Notes:

- `pnpm build` (and any production build) stops with an error if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing. This is deliberate, so a broken site is never deployed. `pnpm dev` does not run this check; without the keys it shows a "Setup needed" screen.
- Creating, deleting, or resetting staff logins from the admin console also needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. This key is server-only and must never start with `NEXT_PUBLIC`. Without it, the admin API route returns a 500 error.
- `.env.local` is git-ignored. Never commit real keys.

## Docs map

| Document | What it is for |
| --- | --- |
| [docs/SETUP-AND-DEPLOY.md](docs/SETUP-AND-DEPLOY.md) | Step-by-step go-live runbook: Supabase, SQL order, Netlify, smoke test, rollback |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | One-screen overview: diagram, folder map, data model, RLS summary |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Why things are the way they are (decision log) |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Accounts, secrets locations, ownership transfer, recurring chores |
| [docs/STATUS.md](docs/STATUS.md) | Current snapshot: done, in progress, deferred, waiting on the owner |
| [CLAUDE.md](CLAUDE.md) | Short project brief for the team and AI assistants |
| [DESIGN.md](DESIGN.md) | Design rules (green-only brand colors, fonts, RTL) |

Older planning documents (`PROJECT_PLAN.md`, `docs/SRS.md`, `docs/SRS-v2-admin-console.md`, and others in `docs/`) are kept for history and may contain out-of-date details such as Vercel hosting or an approval queue. When they disagree with the docs above, trust the docs above.

## Who reads what

- Owner or reception manager: [docs/STATUS.md](docs/STATUS.md), then [docs/HANDOFF.md](docs/HANDOFF.md).
- Developer or ops person going live: [docs/SETUP-AND-DEPLOY.md](docs/SETUP-AND-DEPLOY.md), then [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Anyone changing the product: [docs/DECISIONS.md](docs/DECISIONS.md), [CLAUDE.md](CLAUDE.md), and [DESIGN.md](DESIGN.md) first.
