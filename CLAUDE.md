# CLAUDE.md — GymConnect project brief

Read this first. It's the shared context for the whole team.

## What it is
A gym member-management web app for reception staff: store members (name + phone),
search them, and **broadcast a WhatsApp text message** to selected members. Saudi context,
**bilingual English/Arabic (RTL)**.

## Tech
Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Geist font ·
(Supabase = planned for database + login). Deploys to Vercel.

## Structure
- `app/page.tsx` — main screen: state, add/delete member, broadcast + WhatsApp handoff
- `components/` — `add-member-form`, `members-list`, `member-card`, `broadcast-panel`,
  `delete-dialog`, `settings-panel`, `toast` (+ full shadcn `ui/`)
- `lib/translations.tsx` — EN/AR strings + theme/lang/WA context (AppProvider)
- `supabase/schema.sql` — planned database (not wired yet)

## Current state (v1)
✅ Add/search/delete members · text broadcast with `{name}` · Not sent/Sent status ·
dark+light · EN/AR. **Data is in-memory (localStorage for prefs only) — nothing persists yet.**

## Planned (v2)
Database + login (admin-only, no public signup) · bulk delete · auto-delete (default 3 days) · deploy.

## Rules
- **Design:** follow `DESIGN.md` — green (`--primary #10b981`) only, no off-brand colors.
- **Bilingual:** every user string in `lib/translations.tsx`, EN + AR, use `start/end` (RTL).
- **Keep it typed:** `tsc` clean. Match existing patterns; don't invent new ones.
- **Team model:** specialists in `.claude/agents/` — deploy the right one per task; QA + security check before merge.
