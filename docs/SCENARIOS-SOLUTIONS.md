# GymConnect — Best-Practice Solutions Catalog (v2, panel-reviewed)

*Companion to `docs/SCENARIOS.md`. v2 supersedes v1: the Scenario Mapper's solutions were challenged by a 4-agent panel — **Black Hat (security)**, **Backend/Data**, **Frontend**, **Customer Advocate (real reception staff)** — and rewritten to the best version each perspective could agree on. Perspective tags: 🛡️ security · 🗄️ backend · 💻 frontend · 🙋 user. 2026-09-30.*

---

## Part A — Panel consensus: the rulings that changed the answer

These are the corrections that matter most. Where a fix appears below, it overrides the v1 wording.

**1. The one 0-row rule (fixes the whole ghost cluster correctly).** 🗄️🛡️💻
The Mapper said "classify a real RLS denial by error code." **That's wrong for DELETE/UPDATE:** an RLS-blocked delete/update returns **0 rows silently, no error code** — only INSERT (`WITH CHECK`) raises `42501`. So the real rule, applied to delete, mark-sent **and reset**:
> **0 rows never means "failed" by itself.** On any 0-row write, do one cheap probe of the caller's own `profiles.role` (allowed by `profiles_self_read`) and/or a silent refetch. If the caller is still `staff`/`admin` → the row is simply **gone** → treat as **success** (delete removes it; mark-sent drops the member; reset succeeds). If the role is lost (`pending`/none) → it's a **denial** → route to the pending gate.
This **reverses the Mapper's BCAST-36**: reset-sent hitting 0 rows is *success + refetch*, **not** rollback. One rule, three operations. (Safe here only because the members policy is role-based, not per-row ownership — 🛡️ do not copy "0-row = success" into any future owner-scoped table.)

**2. WhatsApp handoff: keep `noopener,noreferrer`.** 🛡️💻
The Mapper's BCAST-26 (drop `noopener` to detect a blocked popup) and BCAST-25 (reuse one named tab) both require dropping `noopener` — which re-opens **reverse-tabnabbing** (the WhatsApp tab can redirect your app to a phishing page) and leaks the app URL. **Ruling:** keep `noopener,noreferrer`; each open is a direct user click, which browsers don't popup-block, so drop the null-handle heuristic. Accept a new tab per recipient on WhatsApp Web. On **mobile, prefer `wa.me/<phone>?text=`** (opens app-or-web smoothly, X-21). Test tab behavior on a real desk PC before any reuse scheme.

**3. Login errors must never reveal whether an account exists.** 🛡️
Distinguishing offline / paused / rate-limit is safe (account-independent). But **`email_not_confirmed` is an enumeration oracle** — Supabase returns it only for a real-but-unconfirmed email. **Ruling:** unknown-email, wrong-password, and unconfirmed-email all collapse to the **one generic** `t.loginFailed`. Only branch on network / paused / 429. Never render raw PostgREST `error.message`/`details`/`hint` anywhere (leaks tables, columns, and PII).

**4. Refetch = a silent background merge, not the initial-load path.** 🗄️💻🙋
`visibilitychange` alone misses the main case (a reception PC sits in the foreground all day). **Ruling — the concrete pattern:** trigger on `focus` + `visibilitychange` + `online`, **plus a gentle 60–90s poll while visible**, plus a forced refetch **on Broadcast open and on Start**. Throttle to a ≥30–60s minimum gap. It must be **silent** (no spinner, FR-9), must **not** unmount the list or lose search text/selection, must be **paused while a broadcast is running**, and must **not clobber an in-flight optimistic update** (guard with a request-sequence token + a "writes in flight" counter; a late response defers via a `dirty` flag). Realtime (a debounced invalidation *poke*, then the same refetch) is the v2 upgrade once >1 staff share the screen; it narrows BCAST-33 but doesn't replace refetch.

**5. Sign-out: revoke server-side when you can.** 🛡️
Don't hardcode `scope:'local'` (leaves the refresh token alive server-side). **Ruling:** attempt the default **global** `signOut()` (short timeout) → on network failure fall back to `signOut({ scope:'local' })` → always clear local state and show the login screen ("Signed out on this device").

**6. Timeouts belong in one place; a write timeout is "unknown", not "failed".** 🗄️💻
Put a single `fetchWithTimeout` (~15s, `AbortSignal.timeout`) in `createClient({ global:{ fetch }})` so auth + REST both get it — not per-call. **A timed-out write may still have committed**, so show "saving… checking" then **refetch and reconcile**; never show "failed", never auto-retry a write.

**7. Reject SET-15.** 💻 Rendering children before prefs load breaks SSR/the toast portal and flashes English/LTR to Arabic users. Keep `return null` + `<noscript>` + the SET-03 pre-hydration `<head>` script so first paint is already correct (the app can't run without JS anyway — auth needs it).

**8. Honest, human error wording + say "Messaged", not "Sent".** 🙋
Use plain reassuring copy (Part C table). Crucially, X-02 must say **"Couldn't load members — nothing was deleted"** (the current "No members yet" makes staff re-add everyone). And the status word: not "Sent" (overclaims — the app only opens the chat) and not "Contacted" (implies a call); use **"Messaged" / تمت مراسلته**, and end a broadcast with *"Opened 12 of 15 chats — remember to press Send in WhatsApp for each."*

**9. Promote four "PO questions" to must-fix — they hit daily use.** 🙋
Phone-paste normalization (ADD-20/21/22) + Arabic-digit/format search (SEARCH-07/09) are **rank-1** for the add/lookup flow. **Arabic name search (SEARCH-10)** and **compound Arabic first names (BCAST-10, "Hi عبد" is embarrassing)** are real fixes, not options. Add a read-only **"members auto-delete after 3 days"** line (SET-17) so staff don't think data vanished. And **strongly consider allowing expat numbers (ADD-24)** — many Saudi gym members are non-Saudi; if blocked, staff enter fake numbers.

**10. The database is the trust boundary.** 🛡️🗄️ Staff can call the API directly (ADD-37), so invisible/blank/bidi name defenses (ADD-07/13) need **DB CHECKs too**, not just client stripping. End `schema.sql` with a **self-verification `do` block** that asserts the constraints, RLS, and grants exist (rolls back the run if any is missing). Model write results as a typed `ApiError { kind }` carrying `status` + `code` (currently `throw error` discards status).

---

## Part B — Refined solutions by feature (Wave-3 items in full)

Only the flagged scenarios; unchanged-from-v1 rows are marked "= v1". Perspective tags show who sharpened it.

### Login & session
| ID | Best solution (v2) | Tag |
|---|---|---|
| LOGIN-10/11 | Classify from `AuthError`: `isAuthRetryableFetchError`/5xx → `t.cantConnect`/`t.serviceUnavailable`; never message-text match. Paused vs offline is **not** client-distinguishable → either one "can't connect, try again" message, or a same-origin `/api/health` probe (below). | 🛡️🗄️ |
| LOGIN-12 | 429 → `t.tooManyAttempts`. **Unconfirmed-email → the generic `t.loginFailed`** (anti-enumeration), not a distinct message. | 🛡️ |
| LOGIN-13/14/16 | One list-state union `loading|ready|error|pending`; fetch role + members with `Promise.all` in an effect **keyed on `userId`** (never inside `onAuthStateChange` — deadlock risk), set both in one batched update (no "ready" flash). Pending/no-profile → a friendly gate **with header, Sign out, and Refresh** (not a dead end). Demotion mid-session (0-row or 42501) → route to the gate, keep session + typed state. | 💻🗄️🙋 |
| LOGIN-18/22/23 | `prevUidRef` + `explicitSignOutRef`; pass a `notice` prop to `<LoginScreen>` (`t.sessionExpired`/`t.sessionEnded`/`t.accountChanged`). auth-js keeps the session on offline refresh failures; only an invalid refresh token emits `SIGNED_OUT`. | 💻 |
| LOGIN-20 | Global revoke online → fallback `scope:'local'` on failure → always clear + show login "Signed out on this device". | 🛡️🙋 |
| LOGIN-25 | One line: `createClient(url,key,{ auth:{ detectSessionInUrl:false }})` kills invite/recovery auto-sign-in. Keep dashboard provisioning for v1. | 🗄️ |
| LOGIN-27 | `NEXT_PUBLIC_*` are build-time inlined → **fail the build** if missing (prebuild check); a module-throw can't be caught by `app/error.tsx`. Also export `supabaseConfigured` and render a `t.configError` card in `AuthProvider`. | 💻🗄️ |
| LOGIN-28 | Likely already handled — auth-js falls back to in-memory storage when localStorage is unavailable; **test** rather than build. In-memory is *more* secure (token dies with the tab). | 🗄️🛡️ |
| LOGIN-29/X-07 | `.catch` on `getSession()` (→ show login, or an error banner if a cached session existed) and on `signOut()`. | 💻 |
| LOGIN-31 | Idle sign-out at **60 min** (not 30) with a **2-min warning + "Stay signed in"**; **paused while the broadcast panel is open/running** (staff are in WhatsApp, look idle); compare `Date.now()` on wake (timers throttle). Free-tier: client timer only, best-effort. | 🙋💻 |
| LOGIN-30 | Add a compact language+theme toggle to the login header (Arabic staff shouldn't be stuck in English); PO may set Arabic as default. | 🙋 |

### Add member
| ID | Best solution (v2) | Tag |
|---|---|---|
| ADD-20/21/22/19 | One idempotent `lib/phone.ts` normalizer, shared with search + `onPaste`: map Arabic-Indic/Persian/full-width digits → ASCII, strip `+`/spaces, strip leading `00`/`966`/`0`, then slice(0,9). **Rank-1 daily fix.** | 🙋💻 |
| ADD-07/13 | Strip zero-width + bidi controls client-side **and add DB CHECKs** (`name !~` blank/zero-width; `name !~ '[‪-‮⁦-⁩]'`), `NOT VALID` first. DB is the trust boundary. | 🛡️🗄️ |
| ADD-06/10 | Remove `maxLength`; clamp by grapheme (`Intl.Segmenter`) in `onChange` only when >100. Initials via `Intl.Segmenter` too (ZWJ emoji safe). Move `initials`/`prettyPhone`/`firstName` to `lib/format.ts`. | 💻 |
| ADD-24 | **Recommend allowing expat numbers:** store digits-only E.164 (`^[1-9][0-9]{7,14}$`), keep UNIQUE, no country column. (Was a PO question — user advocate elevates it.) PO confirms. | 🙋🗄️ |
| ADD-25 | Keep `^5\d{8}$`; do **not** enforce a stricter carrier-prefix list (it omits valid ranges like 57/58). | 🗄️ |
| ADD-30/31/46 | One `canAdd = status==="ready"` gate: disable only the submit button (never inputs) while loading/error; disable Broadcast unless ready. S-size, replaces the Mapper's mirrored states. | 💻 |
| ADD-33 | Global fetch timeout (Part A #6). Timeout = "checking", reconcile; re-enable form. | 🗄️💻 |
| ADD-34 | On failure, **refetch to reconcile**; success only if the phone now exists **with the same name** (different name = another staff → "exists"). Don't `.eq("phone",…)` (PII in gateway logs); don't `upsert ignoreDuplicates`. | 🗄️ |
| ADD-35/36 | `42501`→`t.accessDenied` (+ role re-check); distinguish `23514` by constraint name in `message` (`…name_valid_chk`→`t.nameInvalid`, `…phone_format_chk`→`t.phoneInvalid`). **Never** show/log `err.details` (contains phone/name). | 🗄️🛡️ |
| ADD-38 | Clear the search query on successful add (lift the query state / `onAdded` signal) so the new row is visible. | 💻🙋 |

### Search
| ID | Best solution (v2) | Tag |
|---|---|---|
| SEARCH-07 | Reuse `lib/phone.ts`; **only** phone-normalize when the query looks like a phone (`/^[\d\s+\-()٠-٩۰-۹]+$/` and ≥3 digits) — otherwise `normalize("")` matches everyone. Precompute a normalized `searchKey` per member in `useMemo([members])`. | 💻🗄️ |
| SEARCH-09 | Map Arabic-Indic/Persian digits in the query (same table). | 💻 |
| SEARCH-10 | **Promote to a real fix:** normalize name+query — `NFKD`, strip `\p{M}` tashkeel, أ/إ/آ→ا, ة→ه, ى→ي; cache in the precomputed key. Staff type احمد for أحمد constantly → misses cause duplicate adds. | 🙋💻 |
| SEARCH-14 | `useDeferredValue(query)` + `useMemo` filter; `React.memo` the card with a **stable** `onDelete(member)`/`onWhatsAppClick(phone)` API + `useMemo` the `sentIds` Set + `useCallback` handlers; `content-visibility:auto` instead of virtualization. | 💻 |

### Delete
| ID | Best solution (v2) | Tag |
|---|---|---|
| DEL-10/X-11/AUTO-03 | **Idempotent-delete via the one 0-row rule (Part A #1):** use `delete({ count:"exact" })`; 0 rows + still-staff → success (member stays removed); role lost → denial + gate. No resurrection, no loop. | 🗄️💻 |
| DEL-15 | `useReturnFocus(isOpen, fallbackRef)` → focus the members heading (`tabIndex=-1`) when the opener is gone. | 💻 |
| DEL-18 | `break-words`/`overflow-wrap:anywhere` on the dialog name. | = v1 |
| DEL-04/06/09/19 | DEL-04: update SRS FR-24 (backdrop doesn't dismiss a destructive confirm). DEL-06: verified benign. DEL-09/19: with idempotent-delete + server order, the clamped-index restore is rarely hit; reconcile on timeout rather than roll back. | 🗄️ |

### Broadcast & sent status
| ID | Best solution (v2) | Tag |
|---|---|---|
| BCAST-13/27 | `recipients = shown.filter(selected.has)` drives both the footer count and the queue (count == what's messaged); **deselect on send** and drop already-sent ids on finish/abort so Start can't re-message them. | 💻🗄️ |
| BCAST-17/18 | Keydown `if(e.repeat) preventDefault()` on the step content (suppresses the synthesized click) + mouse `if(e.detail>1) return` + a **ref** lock ~300ms (reset at Start). Keep `window.open` synchronous (no timeout/debounce); don't `key` the buttons by id (breaks focus). | 💻🙋 |
| BCAST-24/38 | Rename status **"Messaged"** (badge/filters); summary: *"Opened X of N chats — press Send in WhatsApp for each."* Clear message + selection on Done. | 🙋 |
| BCAST-25/26 | Keep `noopener,noreferrer`; drop the popup-block heuristic (clicks aren't blocked); a tab per recipient on Web; `wa.me` on mobile. If a popup message is ever needed: *"Your browser blocked WhatsApp — allow pop-ups for this site, then tap again."* | 🛡️💻🙋 |
| BCAST-31/AUTO-04/07 | Refetch-on-Start is the real fix (drop-after-open is too late). Best: **verify-on-enter** — a `[qi]` effect checks the current recipient in the background, keeps "Open & send" disabled until it returns, **auto-skips** a purged member and notes it in the summary — never an error mid-run. `setMemberSent` returns `applied:boolean` (no throw on 0 rows). | 🗄️💻🙋 |
| BCAST-32/33 | Refetch on panel open + the Part A #4 pattern; plus **re-check the Sent flag right before each Open & send** and skip with "already messaged by a colleague" (stops double-messaging better than open-time refetch alone). | 🙋🗄️ |
| BCAST-34 | Generalize `DeleteDialog`→`ConfirmDialog` (title/body/confirmLabel/destructive), reuse Radix; nest in the panel at `z-[60]`; count via the `{n}` replacer; confirm **every time** (rare action, big damage); visible label on mobile; after reset `setFilter("notSent")` and focus the "Not sent" filter. | 💻🙋 |
| BCAST-36 | **Reversed from v1:** 0 rows = success + refetch (Part A #1), not rollback. If Q4 wants admin-only, make it a SECURITY DEFINER `reset_sent()` RPC that checks admin and raises 42501 otherwise (revoke execute from anon). | 🗄️ |
| BCAST-02/03/05/08/23/40/42/43/46 | 02: `t.noRecipients` distinct empty state. 03: `t.enterMessageToStart` hint. 05: cap on `encodeURIComponent(message).length` (Arabic ~6×). 08: **silently** treat `{Name}`/`{ name }`/`{NAME}` as `{name}` (`/\{\s*name\s*\}/i`) + an "Insert name" chip (braces are awkward on an Arabic keyboard) — don't nag. 23: one `openWhatsApp(pref,phone,text?)` helper (`location.href` for the desktop scheme). 40: memo'd `RecipientRow`. 42: `min-w-0`+`truncate`. 43: LRI/PDI around `{name}` in the string + shared `<Phone><bdi dir="ltr">`. 46: gate via list-state. | 💻🙋 |
| BCAST-10 | **Promote to must-fix:** smart compound Arabic first name (عبد ال…, أبو…, أم…, titles Dr./د. → first two tokens); the step preview lets staff catch the rest. | 🙋 |

### Settings, auto-delete, cross-cutting
| ID | Best solution (v2) | Tag |
|---|---|---|
| SET-03 | Inline `<head>` script, allowlisted values, try/catch; also set `lang`/`dir` for `ar`. (`suppressHydrationWarning` already on `<html>`.) | 💻 |
| SET-06 | Adjust-during-render freeze of `panelSide` on open only (not an effect that fires on close). | 💻 |
| SET-07/X-14 | Portal **only the visual toast div** to body (leave the two `aria-live` regions in place); add `pointer-events-none` unconditionally (better than `top-20`, which covers the add form at 360px). | 💻 |
| SET-13 | `storage` listener in `AppProvider`; re-read allowlisted prefs via `readPref` and call the raw setters (not `setLang`, which animates). | 💻 |
| SET-15 | **Rejected** (Part A #7). | 💻 |
| SET-17 | Read-only "members auto-delete after 3 days" line in the list header/settings (no control in v1). | 🙋 |
| X-27 | Check `prefers-reduced-motion` at call time in `setLang` → instant switch; global `@media` rule sets durations to `.01ms` (not `none`, so Radix Presence still fires `animationend`). | 💻 |
| X-01/02/03/04/06 | Typed `ApiError` taxonomy everywhere + global timeout + honest wording (Part C). X-02 keeps the error card mounted with Retry; never `t.noMembers` on error. Paused vs offline → `/api/health` route or one combined message. | 🗄️💻🙋 |
| X-08 | `.range()` loop with `{ count:"exact" }`, advance by `data.length`, order `created_at desc, id`, dedupe by id (offset paging isn't snapshot-consistent). Or the 5-line fallback: add `count:"exact"` to the single fetch and warn if `count > rows.length` (72h retention makes >1000 unlikely). | 🗄️ |
| X-18 | Shared `<Phone><bdi dir="ltr">` everywhere phones render. | 💻 |
| AUTO-09 | `cleanup_old_members()` writes `last_cleanup_at`/`deleted_count` to a no-client-grant table; stale (>2h) = alert. Keep-alive via **Vercel Cron** (daily, Hobby-allowed) hitting `/api/health` → anon `select 1` RPC (no service key). Free tier pauses after ~7 idle days. | 🗄️ |
| AUTO-10 | Wrap `create extension pg_cron`+schedule in `do … exception when others then raise warning` (guarded by `pg_extension`) so RLS survives a cron failure; end the file with a self-verifying assertion `do` block (constraints, `relrowsecurity`, policies, `not has_table_privilege('anon',…)`, `not has_column_privilege('authenticated','members','created_at','update')`). | 🗄️ |
| AUTO-13 | Free tier has no PITR/backups (verify); document deleted-PII retention if on Pro. | 🗄️ |

---

## Part C — Human error wording (EN; AR intent, native-review before ship) 🙋
| Case | English |
|---|---|
| Offline (LOGIN-10, ADD-32/33) | "No internet connection. Check the Wi-Fi and try again." / add-form: "Not saved — what you typed is kept." |
| Paused/unavailable (LOGIN-11, X-03) | "The system is temporarily unavailable. Try again in a few minutes; if it keeps happening, tell the manager." |
| Rate limit (429) | "Too many tries. Wait a minute, then try again." |
| Load failed (X-02) | "Couldn't load members. **Nothing was deleted.** [Try again]" |
| Access denied (ADD-35) | "This account isn't allowed to do that. Ask the manager." |
| Signed out (LOGIN-18) | "You were signed out. Please sign in again." |
| Pending gate (LOGIN-13) | "Your account is waiting for approval. Ask the gym manager to approve it, then tap [Check again]." + "Signed in as …" + Sign out |
| Bad credentials (LOGIN-03/04/12-unconfirmed) | The single generic "Wrong email or password." |

---

## Part D — Updated fix order

### Wave 3 — must-fix before go-live
1. **The one 0-row rule** — idempotent delete + mark-sent-drop + **reset-sent-success** via a `count:"exact"` result + role probe on 0 rows (Part A #1). *One small `members-api.ts` + `page.tsx` change; collapses DEL-10, X-11, AUTO-03/04, BCAST-31/36.*
2. **Silent refetch** (focus/visibility/online + 60–90s poll + on Broadcast-open/Start), throttled, guarded against optimistic writes, paused during broadcast (Part A #4) — collapses AUTO-02/05/06, X-09, ADD-27/28.
3. **Verify-on-enter in broadcast** (auto-skip purged recipients, never error mid-run) + **re-check Sent before each send** (BCAST-31/32/33).
4. **Login safety:** generic message for all credential/enumeration cases (LOGIN-12 🛡️), sign-out global-then-local (LOGIN-20), `detectSessionInUrl:false` (LOGIN-25).
5. **Pending/error/loading state model** + friendly gate + honest wording incl. "nothing was deleted" (LOGIN-13/14/16, X-02, Part C).
6. **Error taxonomy + one global fetch timeout** ("checking", reconcile, no auto-retry) (Part A #6, X-01/03/04).
7. **Reset-sent confirm dialog** (BCAST-34) + **rapid-fire guards** (BCAST-17/18) + **selection integrity** (BCAST-13/27).
8. **Phone paste + search normalization** (`lib/phone.ts`, ADD-20/21/22, SEARCH-07/09) 🙋 rank-1.
9. **Keep `noopener,noreferrer`; `wa.me` on mobile** (BCAST-25/26 🛡️).
10. **Build fails on missing env vars** (LOGIN-27); **schema self-verification block** (AUTO-10).
11. **Toast `pointer-events-none`** (X-14); **"Messaged" wording** (BCAST-24/38); **"auto-delete after 3 days" note** (SET-17).

### Wave 3.5 — strongly recommended (user-facing)
- **Arabic name search** (SEARCH-10) and **compound Arabic first names** (BCAST-10) 🙋 — both cause real daily pain.
- **Allow expat numbers** (ADD-24) if PO agrees.
- **ADD-07/13 DB CHECKs** for invisible/bidi names 🛡️.

### Wave 4 — polish
SET-03/06/07/13, X-08/12/16/17/18/19/27, LOGIN-06/28/29/31, ADD-05/06/10/38, DEL-15/18, BCAST-02/03/05/08/23/40/42/43, SEARCH-14, AUTO-09/13, LOGIN-30, the `/api/health` route + Vercel-Cron keep-alive.

### PO decisions still needed
LOGIN-15/23/26, ADD-24 (recommend yes), SEARCH-08, BCAST-15/37, SET-14, AUTO-08/11, and confirming the Part-C Arabic wording with a native speaker. Highest-value: **ADD-24** (expat numbers) and the **"Messaged" wording**.

---

*Reviewed & consolidated from: Scenario Mapper (v1 solutions) · Black Hat 🛡️ · Backend/Data 🗄️ · Frontend 💻 · Customer Advocate 🙋.*
