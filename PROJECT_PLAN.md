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
- 👷 **18 specialist agents** (`.claude/agents/`) — deployed per task; security + QA gate every release.

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
| 7 | **Fix launch bugs** (see audit) | 🔧 In progress |
| 8 | Bulk delete + "delete all sent" | ⏳ Planned |
| 9 | Deploy to Vercel | ⏳ After fixes |

---

## 5. Where we are today
- Database + login are **built and merged to main**, and reviewed.
- Supabase project is **live**; signup is **locked**; admin account created.
- **Not deployed yet** — on purpose. The full review found bugs to fix first.
- 👉 **Next action:** Lead fixes the **4 must-fix bugs** in `docs/AUDIT.md`, re-checks, then we deploy.

---

## 6. Decisions log
- Free stack: **Supabase** (DB + login) + **Vercel** (hosting) — $0.
- **No public signup** — admin creates every account.
- Auto-delete default **3 days**; options 7h / 24h / 2d / 3d.
- Media broadcast = **future feature** (needs paid WhatsApp API).
- Design locked to green (`DESIGN.md`); project brief in `CLAUDE.md`.

---

## 7. Open risks
- Bugs from the audit (being fixed).
- WhatsApp ban risk if broadcasts are spammy — send to real, engaged members only.
