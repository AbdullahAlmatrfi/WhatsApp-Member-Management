# GymConnect — Project Plan & Contract 📋

*The single source of truth. You (Product Owner) and the Lead (Claude) both work from this.*
*Last updated: 2026-09-30.*

---

## 1. The deal (what we're building)
A gym member-management web app for reception staff:
- Store members (name + phone), search, delete
- Broadcast a WhatsApp **text** message to selected members
- **Secure login** — only accounts the admin (you) creates
- Members saved in a real database; list auto-cleans after 3 days

**Not in scope now:** sending photos/videos (marked "coming soon"), payments, mobile native app.

---

## 2. How we work (the procedure)
1. **Plan** → agree the feature here (this doc).
2. **Build** → Lead writes the code.
3. **Check** → specialist agents review: **security + QA + code review** must pass.
4. **Fix** → Lead fixes what they find.
5. **Ship** → deploy to Vercel.
6. **Document** → update this plan + the audit.

**Rule:** nothing goes live with an open *Critical* or *High* issue. See `docs/AUDIT.md`.

---

## 3. The team
- 👑 **Product Owner:** Abdullah — decides & approves.
- 🎖️ **Lead:** Claude — plans, builds, runs the specialist agents, reports.
- 👷 **A full bench of specialist agents** (`.claude/agents/` — see its README for the roster) — deployed per task; security + QA gate every release. The bench grows as gaps appear: it now includes a red-team (`black-hat`), a `scenario-mapper`, and launch/ops roles (`accessibility-specialist`, `whatsapp-specialist`, `solutions-architect`, `finops-guardian`, `data-steward`, `customer-success`, `release-verifier`).

---

## 4. Scope & status
| # | Feature | Status |
|---|---------|--------|
| 1 | Add / search / delete members | ✅ Done |
| 2 | Text broadcast + Not sent / Sent | ✅ Done |
| 3 | English / Arabic (RTL), dark/light | ✅ Done |
| 4 | Database (members saved) | ✅ Built |
| 5 | Login (admin-only, no public signup) | ✅ Built |
| 6 | Auto-delete after 3 days | ✅ Built (in DB) |
| 7 | **Fix launch blockers** (Wave 1: B0–B5,B7,B8,B9) | ✅ Done + re-verified |
| 7b | Accessibility rebuild (Wave 2: B6) | 🔧 Next |
| 8 | Bulk delete + "delete all sent" | ⏳ Planned |
| 9 | Deploy to Vercel | ⏳ After Wave 2 |

---

## 4b. v2 — the Admin Console (a page only the admin can open)
*Agreed as the next version after v1 ships. Gated on `role='admin'`.*
| Feature | What it does | Note |
|---|---|---|
| A1 · User management | Approve pending sign-ins → staff; (optional) create accounts (email+password) yourself | "Create" needs a small secure server piece (Supabase Edge Function) — the service key must never touch the browser |
| A2 · Analytics dashboard | Members total, sent vs not-sent, new members over time, broadcasts run, per-staff activity | Some metrics need a small event-logging table |
| A3 · Feedback inbox | Staff send feedback → admin reads it (read/unread) | New `feedback` table + admin-only read policy |
| A4 · Reports / export | One-click export of members / a summary as CSV or PDF | "send us the report" |
| A5 · Activity log | Who added/deleted whom, and when | Accountability / audit trail |
| A6 · Settings UI | Admin toggles the auto-delete window (7h/24h/2d/3d) | Already tracked as FR-50 |

---

## 5. Where we are today
- Database + login **built, merged, and hardened** (Wave 1). Full review + Black Hat red-team: all 10 launch blockers **closed in code**.
- Supabase project is **live**; all 3 signup doors **locked** (PO-verified).
- **Not deployed yet** — on purpose. Remaining: **Wave 2 accessibility**, run the hardened `schema.sql` on the live DB, then a few live smoke tests.
- 👉 **Next action:** Wave 2 (accessibility), then deploy v1. **Then** build the v2 Admin Console (§4b).

---

## 6. Decisions log
- Free stack: **Supabase** (DB + login) + **Vercel** (hosting) — $0.
- **No public signup** — admin creates every account.
- Auto-delete default **3 days**; options 7h / 24h / 2d / 3d.
- Media broadcast = **future feature** (needs paid WhatsApp API).
- Design locked to green (`DESIGN.md`); project brief in `CLAUDE.md`.
- **v2 = Admin Console (§4b)**, built **after v1 ships**, not alongside — ship the safe app first (Lead's call; PO no preference on feature list, so all six are in scope).

---

## 7. Open risks
- Bugs from the audit (being fixed).
- WhatsApp ban risk if broadcasts are spammy — send to real, engaged members only.
