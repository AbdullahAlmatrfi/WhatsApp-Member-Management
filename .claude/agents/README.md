# GymConnect — the team 🏗️

The specialist agents that build, check, and ship GymConnect.

**Chain of command**
- **Product Owner:** the user (Abdullah) — owns the vision, sets priorities, gives final approval on anything big, irreversible, costly, or member-facing.
- **PO proxy (`product-owner`):** stands in for Abdullah's day-to-day direction — turns the plan into the Lead's next build orders and makes routine, reversible calls to keep momentum, but escalates every big/irreversible/uncertain decision back to the real Abdullah for a yes/no. Never fabricates his approval.
- **Product / Tech Lead:** Claude — assembles the team, deploys specialists onto their work, reviews their reports, executes the build, and answers to the Product Owner.
- **The team:** the agents in this folder — each a veteran master of one craft.

**How the team works**
Agents are **deployed onto their work when it's time**, not left idle:
- New feature → `business-analyst` (requirements) → `ux-designer` / `ui-designer` (design) → `frontend-engineer` / `backend-engineer` / `database-engineer` (build).
- Every build → `qa-engineer` + `qa-automation` (test), `security-engineer` (audit), `customer-advocate` (real-user check).
- Before any release → `black-hat` (authorized red-team: attacks the app on purpose to find holes the defensive audit misses).
- Before design + testing → `scenario-mapper` (writes down every user journey and edge case, logical and illogical, start to finish, so nothing is missed).
- Specialists who own a cross-cutting concern:
  - `accessibility-specialist` — WCAG 2.2 AA: keyboard, screen reader, contrast, reduced motion, RTL a11y.
  - `whatsapp-specialist` — the WhatsApp channel: handoff mechanics, ban-avoidance, consent, Business-API trade-offs.
  - `solutions-architect` — the shape of the system: Edge Functions, realtime vs polling, data-model evolution, boundaries.
  - `finops-guardian` — keeps the app inside the free tier; forecasts when a paid plan is truly needed.
- Launch & operations (added after the team reviewed its own gaps):
  - `data-steward` — backup & recovery: the member list must survive a bad delete / free-tier loss. Owns backups, tested restore drills, export/import, RPO/RTO.
  - `customer-success` — onboarding & support: gets the non-technical owner live, trains reception (EN/AR), owns the "who do I call" runbook.
  - `release-verifier` — proves the *deployed* system matches the code: live RLS tests, schema run, headers, config-drift; a separate GO/NO-GO so the proof isn't self-graded.
- Before release → `performance-engineer`, `compliance-officer`, `release-manager` (go/no-go).
- Around launch → `devops-engineer` (CI/CD), `sre` (monitoring), `technical-writer` (docs), `localization-specialist` (EN/AR), `data-analyst` (insights).

No code merges without the relevant specialists' sign-off. That's how one AI does the work of a team — with real, independent checks.
