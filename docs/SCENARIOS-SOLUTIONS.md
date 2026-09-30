# GymConnect — Best-Practice Solutions Catalog

*Companion to `docs/SCENARIOS.md`. Same IDs. Every scenario flagged ⚠ needs-check or ❓ decision-needed gets a concrete fix; blank-flag groups are noted "✓ mostly as built". By the Scenario Mapper agent (20-yr veteran), 2026-09-30. Effort: S ≈ <1h, M ≈ a few hours, L ≈ a day+.*

---

## 1. LOGIN and SESSION

| ID | Problem | Best-practice solution | Effort | Where |
|---|---|---|---|---|
| LOGIN-06 | Malformed email → native browser bubble, wrong language | Add `noValidate`; validate email in `submit()`, set localized `t.emailInvalid`. | S | login-screen, translations |
| LOGIN-10 | Offline → "Wrong email or password" | Distinct error taxonomy: `invalid_credentials`→`t.loginFailed`; network failure→`t.cantConnect`. Catch thrown network errors. | M | auth, login-screen, translations |
| LOGIN-11 | Paused project → "Wrong email or password" | 503/paused (fetch fails/5xx)→`t.serviceUnavailable`. Pair with Q9 keep-alive. | S | auth, login-screen |
| LOGIN-12 | 429 / unconfirmed email → generic | `429`→`t.tooManyAttempts`; `email_not_confirmed`→`t.emailNotConfirmed`. | S | auth, login-screen |
| LOGIN-13 | `pending` user sees empty app, add fails 42501 | Fetch caller's role on load; if not admin/staff, render an "Account awaiting approval" gate. | M | page, auth, new gate |
| LOGIN-14 | No `profiles` row → same as pending | Absent row = pending (deny), same gate. | S | page, auth |
| LOGIN-15 ❓ | `staff` vs `admin` UI identical | **Default:** identical UI for v1. **PO:** any staff-vs-admin UI difference needed, or DB-permission only? | — | — |
| LOGIN-16 | Role demoted mid-session → stale list, generic errors | On any 42501 write, re-check role; if not staff/admin, force sign-out to gate. | M | page, members-api |
| LOGIN-18 | Session expires mid-work → silent flip | On `SIGNED_OUT`/token failure show login + `t.sessionExpired` banner. | M | auth, page, login-screen |
| LOGIN-20 | Sign out offline stays signed in silently | `signOut({ scope: 'local' })` + try/catch; always clear local state; toast if server revoke failed. | S | auth |
| LOGIN-22 | Two tabs, sign out in A → B silent | Route B to login with `t.sessionEnded` (auth state already fires cross-tab). | S | page |
| LOGIN-23 ❓ | Two tabs, different user in B → A silent identity swap | **Default:** on uid change, hard-reset state + `t.accountChanged`. **PO:** force reload of other tabs, or silent re-key? | S | page |
| LOGIN-25 ❓ | Invite/recovery link auto-signs-in, no set-password | **Default:** disable invite/magic-link; admin sets password in dashboard. **PO:** are invite links in scope for v1? | M | login-screen, new route |
| LOGIN-26 ❓ | No in-app password recovery | **Default:** out of scope (SRS §7); document dashboard reset. **PO:** confirm staff self-reset stays out of v1. | — | docs |
| LOGIN-27 | Missing env vars → `createClient("")` throws at import, blank app | Guard in client.ts; render a friendly `t.configError` state (error boundary) instead of a hard throw. | S | supabase/client, app/error |
| LOGIN-28 | localStorage blocked (private mode) | Memory-storage fallback for the auth session so login works in-session. | M | supabase/client |
| LOGIN-29 | Cold start offline, `getSession()` rejects → infinite spinner | Add `.catch(() => setSession(null))` before `.finally`. | S | auth |
| LOGIN-30 ❓ | No language/theme control before sign-in | **Default:** add a compact lang+theme toggle to the login header. **PO:** show toggles on login, or inherit silently? | S | login-screen |
| LOGIN-31 ❓ | Shared PC idle for hours, no auto sign-out | **Default:** idle timer (~30 min) → sign out. **PO:** idle timeout 15/30/60 min or none? | M | page, new use-idle-timeout |

## 2. ADD MEMBER

| ID | Problem | Best-practice solution | Effort | Where |
|---|---|---|---|---|
| ADD-05 | 101+ char name silently truncated | Keep `maxLength=100` + a live counter / `t.nameTooLong` hint at the cap. | S | add-member-form, translations |
| ADD-06 | Emoji name: UTF-16 vs code-point count mismatch | Validate by `[...name].length <= 100` to align with the DB `char_length` CHECK. | S | add-member-form |
| ADD-07 | Zero-width-space-only name → invisible member | Strip zero-width/format chars + collapse whitespace before the non-empty check (client + stricter DB CHECK). | M | add-member-form, schema |
| ADD-08 | NBSP name → `{name}` returns whole "Ali Ahmed" | Normalize NBSP/Unicode spaces to a regular space on input; split on `/\s/`. | S | add-member-form, broadcast-panel |
| ADD-10 | Emoji-initial avatar → lone surrogate broken glyph | Compute initials with `Array.from(name)` (shared helper), not `name[0]`. | S | member-card, broadcast-panel |
| ADD-13 ❓ | Bidi control chars → spoofable display | **Default:** strip Unicode bidi controls on input. **PO:** strip, or wrap names in `<bdi>`? | S | add-member-form |
| ADD-19 | Full-width digits silently dropped | Map `U+FF10–FF19` to ASCII in `sanitizePhone` before the `\D` strip. | S | add-member-form |
| ADD-20 | Paste `+966 55 123 4567` → `966551234` wrong | Normalize: map digits → strip `+`/spaces → strip `00`/`966`/`0` prefix → slice(0,9). | M | add-member-form |
| ADD-21 | Paste `0551234567` → last digit lost | Strip the leading `0` before slicing (in ADD-20). | — | add-member-form |
| ADD-22 | Paste `00966551234567` | Strip leading `00`/`00966` (in ADD-20). | — | add-member-form |
| ADD-24 ❓ | Expat/foreign number can't be stored | **Default (Q5):** Saudi mobiles only; clear `t.phoneInvalid`. **PO:** must foreign numbers be storable? If yes, widen CHECK + add country picker. | M | add-member-form, schema |
| ADD-25 ❓ | `512345678` accepted (not a real range) | **Default:** keep `^5\d{8}$`. **PO:** enforce real SA prefixes (50/53/54/55/56/58/59)? | S | add-member-form, schema |
| ADD-27 | Dup added by another staff after load → "exists" but row not visible | After 23505, background-refetch so the row appears; keep the toast. (Ties to X-09.) | M | page |
| ADD-28 | Ghost phone blocks re-add | Resolved by the stale-list cluster fix (refetch drops the ghost); DB UNIQUE is the real guard. | (cluster) | page, members-api |
| ADD-30 | Add while list loading → late fetch overwrites new row | Disable Add while `loadingMembers`, or merge on insert. | S | page, add-member-form |
| ADD-31 | Add after failed load → dup check blind | Block Add in the load-error state; force Retry first (X-02). | M | page |
| ADD-33 | Network hangs → "Adding…" forever | AbortController + ~15s timeout → `t.saveFailed`, re-enable form. | M | members-api, page |
| ADD-34 | INSERT committed but response lost → retry 23505, row missing | Refetch before final state; if the phone now exists, treat as success (idempotent add). | M | page, members-api |
| ADD-35 | RLS denies (42501) → generic | Map `42501`→`t.accessDenied` + role re-check (LOGIN-16). | S | page, members-api |
| ADD-36 | Name CHECK (23514) → shows phone message | Distinguish by constraint name: `members_name_valid_chk`→`t.nameInvalid`. | S | page, members-api, translations |
| ADD-38 | Add succeeds while search filters it out → looks failed | Clear the search query on successful add so the new row is visible. | S | page, members-list |

## 3. SEARCH

| ID | Problem | Best-practice solution | Effort | Where |
|---|---|---|---|---|
| SEARCH-07 | Pasted `0551…`/`+966…` don't match | Normalize query AND phone the same way before `includes` (reuse ADD-20 normalizer). | M | members-list |
| SEARCH-08 ❓ | `966`/`9`/`5` matches everyone | Harmless; leave as substring. | — | — |
| SEARCH-09 | Arabic-Indic digits don't match | Map Arabic-Indic/Persian digits to ASCII in the query. | S | members-list |
| SEARCH-10 ❓ | Arabic variants (أ/ا, ة/ه, tashkeel) exact-only | **Default:** light Arabic normalization on name+query. **PO:** fuzzy Arabic matching for v1, or exact ok? | M | members-list |
| SEARCH-14 | 500–1000 members: re-render every card per keystroke | `React.memo` the card + ~150ms debounce; virtualize only if profiling shows >200ms. | M | members-list, member-card |
| SEARCH-15 | >1000 members unsearchable | Same as X-08 (paginate the fetch). | (X-08) | members-api |

## 4. DELETE

| ID | Problem | Best-practice solution | Effort | Where |
|---|---|---|---|---|
| DEL-04 | SRS says backdrop closes; Radix ignores it | Update SRS FR-24 to "Cancel/Escape close; backdrop does not" (destructive-action best practice). | S | SRS |
| DEL-06 | Confirm path fires `Action` then `onCancel` | Verify benign (DELETE only in `onConfirm`; `onCancel` just nulls target). Mark ✓ after test. | S (verify) | delete-dialog, page |
| DEL-09 | Slow/closed mid-DELETE → phantom on reload? | With idempotent-delete a committed delete stays gone; verify no re-insert. | (cluster) | members-api |
| **DEL-10** | **Ghost row delete → 0 rows thrown as error, row resurrected, retry loops** | **Idempotent-delete (the core cluster fix):** treat a 0-row delete as SUCCESS, not failure — remove the `if (length===0) throw`. Classify real RLS denial by error code, not row count. | S | members-api |
| DEL-15 | Focus after delete falls to `<body>` | `onCloseAutoFocus` → move focus to the members heading or search box when the opener is gone. | S | delete-dialog, page |
| DEL-18 | Unbroken 100-char name overflows dialog | Add `break-words`/`overflow-wrap:anywhere` to the name span. | S | delete-dialog |
| DEL-19 | Three quick deletes, one fails → index | Existing clamped-index restore adequate once DEL-10 removes false failures; re-verify. | S (verify) | page |

## 5. SENT STATUS and BROADCAST

| ID | Problem | Best-practice solution | Effort | Where |
|---|---|---|---|---|
| BCAST-02 | Zero members → "No members matching your search" | Add a distinct `t.noRecipients` empty state; reserve `t.noResults` for a non-empty filter. | S | broadcast-panel, translations |
| BCAST-03 | N selected + empty message → misleading disabled label | Show `t.enterMessageToStart` hint; distinguish the two disabled reasons. | S | broadcast-panel, translations |
| BCAST-05 | Very long message → `?text=` may fail | Cap textarea (~1000) with a counter turning destructive near the limit. | S | broadcast-panel |
| BCAST-08 | `{Name}`/`{ name }` typos sent literally | Warn when a brace token isn't exactly `{name}` (explicit > silently rewriting). | S | broadcast-panel |
| BCAST-09 | `$&`/`$1` in a name | ✓ Already correct (function replacer). | — | — |
| BCAST-10 ❓ | Compound Arabic names cut ("عبد الله"→"عبد") | **Default:** first token, but special-case عبد ال…/أبو…/titles (first two tokens). **PO:** full name, first token, or smart-compound? | M | broadcast-panel |
| BCAST-13 | Switch filter, Start → uses hidden selected ids | Filter the queue to intended recipients; show the true count; deselect sent (with BCAST-27). | M | broadcast-panel |
| BCAST-15 ❓ | Queue is list order, not selection order | **Default:** list order fine. **PO:** selection order or list order? | — | — |
| BCAST-17 | Hold Enter auto-repeat → rapid-fire | Ignore `keydown` with `event.repeat`; per-advance lock (~400ms). | S | broadcast-panel |
| BCAST-18 | Double-click Open&send → next member unreviewed | Lock the step during advance; reset guard per `qi`. | S | broadcast-panel |
| BCAST-23 | Desktop `whatsapp://` via `window.open` → blank tab; card uses `location.href` | Use `location.href` consistently for the desktop scheme; unify card + panel through one helper. | S | broadcast-panel, page |
| BCAST-24 ❓ | Not-on-WhatsApp still marked Sent | **Default:** rename to "Contacted"/"Chat opened" (Q2). **PO:** confirm "Sent"="chat opened", or need delivery confirmation? | S | translations |
| BCAST-25 | ≥5 recipients on Web → a new tab each | Reuse one named target: `window.open(url, "gymconnect_wa")` for web mode. | M | broadcast-panel |
| BCAST-26 | Popup blocked → `noopener` returns null, still Sent | For web mode detect a null handle → `t.popupBlocked`, do NOT mark sent. | M | broadcast-panel |
| BCAST-27 | Escape mid-run → Start again re-sends to sent | Remove already-sent ids from `selected` on finish/abort; deselect on mark-sent. | S | broadcast-panel |
| BCAST-30 | Mark-sent fails offline → chat opened, summary overclaims | Reword summary to "chats opened"; log that the flag didn't persist. | S | broadcast-panel, page |
| BCAST-31 | Recipient purged (0-row update) → chat opened to erased member (PDPL) | 0-row mark-sent → drop the member locally + `t.memberRemoved`; prevent opening via refetch-on-open. | M | members-api, page |
| BCAST-32 | List loaded hours ago → past-retention members messageable | refetch-on-open (+ `visibilitychange`) — second half of the cluster fix. | M | page, broadcast-panel |
| BCAST-33 | Two staff broadcast → Sent flags unsynced → double-message | Refetch on panel open + after each mark-sent batch narrows the window; realtime is the v2 fix. | M | page |
| BCAST-34 | Reset-sent: no confirm, global, accidental re-arm | Confirm dialog stating the count; admin-scope if Q4; visible label on mobile. | M | broadcast-panel, new confirm |
| BCAST-35 | Reset fails → restore | ✓ Already correct (rollback). | — | — |
| BCAST-36 | Reset under RLS → 0-row UPDATE, false success | `.select("id")` + row-count check → rollback + error (same pattern as delete/mark-sent). | S | members-api, page |
| BCAST-37 ❓ | Staff A resets while B mid-campaign | **Default:** global, immediate. **PO:** admin-only and/or warn when a campaign is active? | — | — |
| BCAST-38 ❓ | Summary overclaims; message text retained | **Default:** "X of N chats opened"; clear message+selection on Done. **PO:** confirm wording + whether compose persists. | S | broadcast-panel, translations |
| BCAST-40 | 500–1000 members: re-render list per keystroke | Memoize the recipient row; textarea state shouldn't re-render the list. | M | broadcast-panel |
| BCAST-42 | Unbroken 100-char name overflows step card | Add `min-w-0` + `truncate`/`break-words`. | S | broadcast-panel |
| BCAST-43 | Arabic: mirrored `}name{`; `+966…` not isolated | Wrap `{name}` token + phone in `<bdi dir="ltr">`. | S | broadcast-panel |
| BCAST-46 | Panel opened while loading/failed → empty list silently | Show loading/error+retry inside the panel mirroring the main list state. | M | broadcast-panel, page |

## 6. SETTINGS and PREFERENCES

| ID | Problem | Best-practice solution | Effort | Where |
|---|---|---|---|---|
| SET-03 | `<html class="dark">` static → dark flash for light users | Pre-hydration inline `<head>` script reads `theme_preference` and sets the class before paint. | S | app/layout |
| SET-06 | Language switch flips sheet side mid-animation | Freeze `panelSide` while the sheet is open. | S | settings-panel |
| SET-07 | Toast jumps during the language transition | Portal the toast + overlays to `document.body`, outside the transform wrapper. | M | toast, page |
| SET-13 | Two tabs: language change not synced | Add a `storage` event listener in `AppProvider`. | S | translations |
| SET-14 ❓ | Prefs per-browser on a shared PC | **Default:** per-browser fine. **PO:** reset to defaults on each sign-in? | — | — |
| SET-15 | JS disabled/slow hydration → blank page | Render children with default styling instead of `return null`. | S | translations |
| SET-17 ❓ | No auto-delete window UI (FR-50) | **Default:** fixed 72h, no UI (DB CHECK enforces). **PO:** admin retention selector at launch, or v2? | — | — |

## 7. AUTO-DELETE

| ID | Problem | Best-practice solution | Effort | Where |
|---|---|---|---|---|
| AUTO-02 | Row purged while list open → ghost until reload | refetch-on-focus/visibility. Part of the cluster fix. | M | page |
| AUTO-03 | Delete a ghost → error + resurrection | Fixed by idempotent-delete (DEL-10). | S | members-api |
| AUTO-04 | Mark-sent on a ghost → rollback + error | Fixed by BCAST-31 (0-row → drop, not rollback). | M | members-api, page |
| AUTO-05 | Open a ghost's chat → erased member messaged | Fixed by refetch-on-open (BCAST-32). | M | page |
| AUTO-06 | Re-add a ghost's phone blocked | Fixed by refetch (ADD-28); DB UNIQUE is the guard. | (cluster) | page |
| AUTO-07 ❓ | Member purged mid-campaign, mark-sent fails | **Default:** on 0-row mark-sent during a run, skip silently + note in summary. **PO:** skip silently or surface a "removed" notice? | M | broadcast-panel |
| AUTO-08 ❓ | Retention counts from `created_at`, not send time | **Default:** keep `created_at`-based (simplest, PDPL-clean). **PO (Q3):** acceptable, or count from last activity? | — | — |
| AUTO-09 | pg_cron paused → silent no-deletes; mass delete on resume | Monitoring/alert that the job ran; document paused-project behavior; keep-alive (Q9). | M | ops docs, schema |
| AUTO-10 | Partial `schema.sql` run may leave objects missing | Post-run verification checklist (pg_constraint/pg_policies/cron.job/grants); split pg_cron so an extension error doesn't abort RLS. | S | schema, deploy checklist |
| AUTO-11 ❓ | "7" ambiguous; ≤0 "off" vs CHECK forbids 0 | **Default:** label options explicitly; keep CHECK `in (7,24,48,72)`, no "off". **PO:** confirm windows + no "off" (Q3). | S | schema, future UI |
| AUTO-13 ❓ | Deleted PII may persist in backups/PITR | **Default:** document PITR window in the compliance note; shortest acceptable PITR. **PO (Q8):** does erasure require purging backups? | S | compliance docs |

## 8. CROSS-CUTTING

| ID | Problem | Best-practice solution | Effort | Where |
|---|---|---|---|---|
| X-01 | Offline matrix: wrong/misleading messages | Apply the distinct error taxonomy everywhere: catch, classify (network/auth/RLS/server), localized message. | L (umbrella) | auth, members-api, page |
| X-02 | Fetch fails → "No members yet", staff re-add | Load-error state + Retry (FR-8); never `t.noMembers` on error. | M | page, members-list |
| X-03 | Paused project → empty list + "wrong password" | Detect 503/paused → `t.serviceUnavailable` (X-02 state). | M | page, auth |
| X-04 | Requests hang, no timeouts | AbortController + ~15s timeout on all api/auth calls. | M | members-api, auth |
| X-06 | RLS denies → silent empty list + generic errors | Pending gate (LOGIN-13/14) + `42501→t.accessDenied`. | M | page, auth |
| X-07 | `signOut()`/`getSession()` throw → unhandled rejection | Add `.catch` to both. | S | auth |
| X-08 | >1000 members silently truncated | Paginate `fetchMembers` with `.range()` until fewer than page size return. | M | members-api |
| X-09 | Two staff → changes invisible until reload | refetch-on-focus/visibility now; Supabase Realtime in v2. **The linchpin of the whole cluster.** | M (refetch) / L (realtime) | page, members-api |
| X-11 | Two staff delete same member → error + ghost | Fixed by idempotent-delete (DEL-10). | S | members-api |
| X-12 | Overlays anchored — re-test after language switch | Portal overlays to body (SET-07); re-run the scroll test in both languages. | S (verify) | page, overlays |
| X-14 | Toast covers header controls for 3s | Move toast below the header (`top-20`) or keep the visual toast `pointer-events-none`. | S | toast |
| X-16 | Dead translation strings; hard-coded logo `alt` | Remove/mark unused strings; move logo `alt` to translations. | S | page, translations |
| X-17 | Full RTL sweep needed | QA pass: logical properties, header order, progress direction, toast inline-end in Arabic. | M | all components |
| X-18 | Bidi Arabic phone reorders | Wrap all phones in `<bdi dir="ltr">`. | S | member-card, broadcast-panel |
| X-19 | 360px width — verify no horizontal scroll | Responsive QA at 360px; fix any overflow. | S | page, components |
| X-21 ❓ | iOS/Android handoff | **Default:** on mobile use `wa.me/<phone>?text=` (app-or-web). **PO (Q10):** desktop or phone; use `wa.me`? | M | broadcast-panel, page |
| X-27 | No `prefers-reduced-motion` for the language transition | Gate the transition behind `prefers-reduced-motion`; switch instantly when set. | S | translations |

Blank-flag groups (LOGIN happy paths, most of SEARCH, SET happy paths, X-22/23/24/25/26 security) are **✓ mostly as built**.

---

## Recommended fix order

### Wave 3 — must-fix before go-live

**★ The ghost / stale-list cluster (DEL-10, AUTO-02..06, BCAST-31/32, X-09, X-11, ADD-28) — one coordinated fix:**
1. **DEL-10 / X-11 / AUTO-03 — idempotent-delete.** Make `deleteMemberById` treat a **0-row result as success**, not an error — the direct fallout of the recent optimistic-rollback change. A delete of an already-gone row must NOT throw, resurrect the row, or loop. Classify a real RLS denial by error code, not row count.
2. **BCAST-31 / AUTO-04 — 0-row mark-sent → drop, not rollback.** A 0-row mark-sent means the member is gone: remove it locally instead of reverting to "Sent".
3. **BCAST-32 / AUTO-02/05/06 / X-09 / ADD-28 — refetch-on-visibility + refetch-on-Broadcast-open.** One `visibilitychange` refetch resolves ghosts, cross-staff invisibility, purged-recipient messaging (PDPL), and dup re-add blocking.

Then, still Wave 3:
4. **BCAST-36 — reset-sent 0-row → rollback+error.**
5. **BCAST-34 — reset-sent confirm dialog** (count-stating).
6. **BCAST-17/18 — lock / `event.repeat` guard** (no rapid-fire).
7. **BCAST-13/27 — queue/selection integrity.**
8. **LOGIN-13/14 + X-06 + ADD-35 — pending/no-profile gate** + `42501→t.accessDenied`.
9. **LOGIN-10/11/12/29, X-02/03/04/07 — error taxonomy + load-error+Retry + timeouts + `.catch`.**
10. **LOGIN-20 — sign-out offline** (`scope:'local'`).
11. **ADD-20/21/22/19 + SEARCH-07/09 — phone/search normalization.**
12. **LOGIN-27 — missing env vars → friendly config error.**
13. **AUTO-10 — schema-run verification checklist.**
14. **X-14 — toast not covering header controls.**

### Wave 4 — polish / quality
ADD-05/07/08/10/33/34/36/38, DEL-15/18, BCAST-02/03/05/08/23/25/26/30/40/42/43/46, SEARCH-14/15, SET-03/06/07/13/15, X-08/12/16/17/18/19/27, LOGIN-06/16/18/22/28/31, AUTO-09.

### PO decisions needed (scope, not code)
LOGIN-15/23/25/26/30/31, ADD-13/24/25, SEARCH-08/10, BCAST-10/15/24/37/38, SET-14/17, AUTO-07/08/11/13, X-21.
**Highest-priority calls:** BCAST-24/38 ("Sent" wording), ADD-24 (expat numbers), AUTO-08/11 (retention), X-21 (desktop vs phone / `wa.me`).

*The single highest-leverage change is idempotent-delete + refetch-on-visibility: it collapses the entire ghost cluster — roughly one small `members-api.ts` edit plus one `page.tsx` effect.*

*Signed: Scenario Mapper*
