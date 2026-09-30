# GymConnect v1: Go-Live Scenario Catalog

*By the Scenario Mapper agent · 2026-09-30 · Read from the code (`app/`, `components/`, `lib/`, `supabase/schema.sql`) against `docs/SRS.md` and `docs/AUDIT.md`. Not run in a browser or against the live DB — treat every row as a test to run.*

Flag legend: **⚠ needs-check** = code behavior unclear or looks wrong. **❓ decision-needed** = no defined answer (PO question). Blank = the code handles it correctly. **[probed]** = reproduced by running the app's logic in Node. **[src]** = confirmed in the library source.

## 1. LOGIN and SESSION (`LOGIN-`)

| ID | Trigger | Expected correct behavior | Flag |
|---|---|---|---|
| LOGIN-01 | Cold load, no session | Spinner, then login screen. Zero `/rest/v1` requests. | |
| LOGIN-02 | Valid staff/admin credentials | Busy state, main screen replaces login with no reload, members load. | |
| LOGIN-03 | Wrong password | One generic "Wrong email or password". Stays on login, email kept, button re-enabled. | |
| LOGIN-04 | Unknown email | Message and timing identical to LOGIN-03 (no account enumeration). | |
| LOGIN-05 | Empty email/password, or whitespace-only email | Sign-in disabled. Enter does nothing. | |
| LOGIN-06 | Malformed email `abc` | An in-app localized error. Actual: native browser bubble in the browser's language, not EN/AR. | ⚠ needs-check |
| LOGIN-07 | Email with spaces or UPPERCASE | Trimmed, and login is case-insensitive. | |
| LOGIN-08 | Password with leading/trailing space | Sent unmodified (not trimmed). | |
| LOGIN-09 | Double click / double Enter on Sign in | Exactly one auth request. | |
| LOGIN-10 | Offline / DNS failure at sign-in | A distinct "can't connect" message. Actual: every error becomes "Wrong email or password". | ⚠ needs-check |
| LOGIN-11 | Supabase free-tier project paused | "Service unavailable". Actual: same "Wrong email or password", so staff think they mistyped. | ⚠ needs-check |
| LOGIN-12 | Rate limit (429) / unconfirmed email | Distinct message. Actual: same generic message. | ⚠ needs-check |
| LOGIN-13 | Sign in as a `pending` user (every new auth user is `pending`) | A clear "awaiting approval" state. Actual: renders normally, 0 rows, "No members yet"; add fails 42501 with generic error. | ⚠ needs-check |
| LOGIN-14 | User with no `profiles` row | Same as LOGIN-13. | ⚠ needs-check |
| LOGIN-15 | `staff` vs `admin` | UI/permissions identical today. Confirm intended for v1. | ❓ decision-needed |
| LOGIN-16 | Role demoted to `pending` / profile deleted mid-session | Forced re-check. Actual: list stays stale, writes fail generically, no sign-out. | ⚠ needs-check |
| LOGIN-17 | Reload while signed in | Spinner, then main screen. Never the login form. | |
| LOGIN-18 | Session/refresh token expires mid-work | Login screen with a "session expired" notice. Actual: silent flip; typed text and broadcast message lost. | ⚠ needs-check |
| LOGIN-19 | Sign out | Login screen. Reload still login. Next user sees no prior rows (B7). | |
| LOGIN-20 | Sign out while offline | Signed out, or told it failed. Actual: auth-js keeps the session on network failure **[src]**; button looks dead, user still signed in on a shared PC. | ⚠ needs-check |
| LOGIN-21 | Sign out, then browser Back | No member data rendered. | |
| LOGIN-22 | Two tabs: sign out in A | Tab B flips to login; B loses open broadcast/typing. | ⚠ needs-check |
| LOGIN-23 | Two tabs: different user signs in in B | Tab A silently becomes the other identity with no notice. | ❓ decision-needed |
| LOGIN-24 | Tab regains focus / token refresh | No spinner, no refetch; text and panels retained (FR-9). | |
| LOGIN-25 | Invite / recovery email link (token in URL hash) | Set-password screen. Actual: auto-signs in **[src]**; no set-password UI; invited user is in with no password. | ❓ decision-needed |
| LOGIN-26 | Staff forgets password | Defined recovery. Actual: none in-app (admin resets in dashboard). | ❓ decision-needed |
| LOGIN-27 | Deploy with `NEXT_PUBLIC_SUPABASE_*` missing | Friendly config error. Actual: `createClient("")` throws at import **[src]**; whole app fails to load. | ⚠ needs-check |
| LOGIN-28 | localStorage blocked (private mode) | Login works; persistence undefined. | ⚠ needs-check |
| LOGIN-29 | Cold start offline, expired token; `getSession()` rejects | Login screen or error. Actual: no `.catch` → possible unhandled rejection / infinite spinner. | ⚠ needs-check |
| LOGIN-30 | Language/theme on the login screen | Follows stored pref; no control before sign-in. | ❓ decision-needed |
| LOGIN-31 | Shared reception PC idle for hours | Idle timeout / auto sign-out. Actual: none. | ❓ decision-needed |
| LOGIN-32 | Login screen in Arabic | Card mirrors; email/password stay LTR. | |

## 2. ADD MEMBER (`ADD-`)

| ID | Trigger | Expected correct behavior | Flag |
|---|---|---|---|
| ADD-01 | Valid "Sara Ali" + `551234567` | One INSERT of `966551234567`; row on top, count +1, success toast, fields cleared, no artificial delay. | |
| ADD-02 | Either field empty | Add disabled. | |
| ADD-03 | Name spaces only | Add disabled. | |
| ADD-04 | Name `"  Ali  "` | Stored as `"Ali"`. | |
| ADD-05 | Type/paste 101+ char name | Truncated at 100 by `maxLength`. No visible message. | ⚠ needs-check |
| ADD-06 | 60 emoji name (120 UTF-16 units, 60 code points) | DB allows 100 code points; `maxLength` counts UTF-16 so input blocked early. | ⚠ needs-check |
| ADD-07 | Name only U+200B (zero-width space) | Rejected. Actual: JS `trim()` and DB `btrim` keep it **[probed]** → invisible-name member, blank card. | ⚠ needs-check |
| ADD-08 | Name with NBSP `Ali Ahmed` | `{name}` → "Ali". Actual: `split(" ")` uses ASCII space so `{name}` → "Ali Ahmed" **[probed]**. | ⚠ needs-check |
| ADD-09 | Name `<img src=x onerror=alert(1)>` | Shown literally, no script. | |
| ADD-10 | Name starts with emoji | Avatar shows emoji. Actual: `n[0]` yields a lone surrogate (broken glyph) **[probed]**. | ⚠ needs-check |
| ADD-11 | Double internal space | Stored verbatim; single-spaced search misses. | |
| ADD-12 | Arabic / mixed name | Displays correctly; initials sane. | |
| ADD-13 | Name with bidi control chars (RLO/LRM) | Defined handling; currently none → display spoofable. | ❓ decision-needed |
| ADD-14 | Phone `551234567` | Valid. | |
| ADD-15 | Phone `5512` (short) | Inline `phoneInvalid` error, no DB call. | |
| ADD-16 | Phone `123456789` | Same inline error. | |
| ADD-17 | Type `55a-1 2` | Non-digits stripped live → `5512`. | |
| ADD-18 | Arabic-Indic / Persian digits | Converted → `551234567`, valid **[probed]**. | |
| ADD-19 | Full-width digits `５５…` (IME) | Accepted, or clear feedback. Actual: silently dropped, field empty **[probed]**. | ⚠ needs-check |
| ADD-20 | Paste `+966 55 123 4567` | Recognized as `551234567`. Actual: becomes `966551234`, errors, wrong digits **[probed]**. | ⚠ needs-check |
| ADD-21 | Paste `0551234567` (how Saudis write it) | Leading 0 dropped, valid. Actual: `055123456`, errors, last digit lost **[probed]**. | ⚠ needs-check |
| ADD-22 | Paste `00966551234567` | Same as ADD-20. Actual: `009665512` **[probed]**. | ⚠ needs-check |
| ADD-23 | Paste with newline/tab/RTL marks | Stripped by `\D`. | |
| ADD-24 | Non-Saudi (expat) number, +20/+91 | Defined. Actual: cannot be stored (Q5). | ❓ decision-needed |
| ADD-25 | `512345678` (5-prefix, not a real range) | Accepted by regex. Confirm fine. | ❓ decision-needed |
| ADD-26 | Duplicate phone in loaded list | `numberExists` toast, no INSERT, inputs preserved. | |
| ADD-27 | Duplicate added by another staff after load | "exists" (23505). Row not in this list until reload → confusing. | ⚠ needs-check |
| ADD-28 | Phone of a purged member still shown as a ghost | Client check blocks with "exists" though DB would accept; re-joining member can't be re-added until reload. | ⚠ needs-check |
| ADD-29 | Double click / Enter+click on Add | Exactly one INSERT; DB UNIQUE backstops. | |
| ADD-30 | Add while members still loading (form not gated) | Row stays. Actual: late `setMembers(rows)` can overwrite the prepended row → success toast but member missing until reload. | ⚠ needs-check |
| ADD-31 | Add after a failed load (list looks empty) | Retry/block. Actual: add works, list shows only new row, dup check blind. | ⚠ needs-check |
| ADD-32 | Offline / fetch throws | Red `saveFailed` toast, inputs kept, button re-enabled. | |
| ADD-33 | Network hangs (no request timeout) | Timeout + error. Actual: "Adding…" forever, form locked, no cancel. | ⚠ needs-check |
| ADD-34 | INSERT committed but response lost | Row visible. Actual: error toast, inputs kept; retry gives 23505, row not in list. | ⚠ needs-check |
| ADD-35 | RLS denies (pending / no profile), 42501 | "Access denied" message. Actual: generic `saveFailed`. | ⚠ needs-check |
| ADD-36 | DB CHECK 23514 from the name | Name-specific message. Actual: always the phone message. | ⚠ needs-check |
| ADD-37 | Direct API insert: bad phone / blank / 101-char name / custom id / created_at | Rejected by DB CHECKs + column grants. | |
| ADD-38 | Add succeeds while search filters the new row out | Row visible or user told it's hidden. Actual: success toast but row hidden → looks failed. | ⚠ needs-check |
| ADD-39 | Sign out / change user during save | Late response ignored (uid guard); nothing leaks to next user. | |
| ADD-40 | Enter in name/phone field | Submits once. | |
| ADD-41 | Ten rapid sequential adds | Newest first, count correct, no lost rows. | |
| ADD-42 | Screen reader on invalid phone | `role=alert` announcement; clears on typing. | |

## 3. SEARCH (`SEARCH-`)

| ID | Trigger | Expected correct behavior | Flag |
|---|---|---|---|
| SEARCH-01 | `ali`/`ALI`/`aLi` | Case-insensitive name match **[probed]**. | |
| SEARCH-02 | `"Ali "` (spaces) | Trimmed, matches **[probed]**. | |
| SEARCH-03 | `551234567` / partial `5512` | Phone substring match **[probed]**. | |
| SEARCH-04 | Empty / whitespace query | Shows all. | |
| SEARCH-05 | No match | `noResults`; badge still total. | |
| SEARCH-06 | Zero members | `noMembers` (not `noResults`). | |
| SEARCH-07 | `0551234567` / `+966 55 123 4567` (pasted formats) | Member found (FR-22). Actual: no match **[probed]**. | ⚠ needs-check |
| SEARCH-08 | Query `966`/`9`/`5` | All match (every phone starts `9665`). Harmless. | ❓ decision-needed |
| SEARCH-09 | Arabic-Indic digits `٥٥١` | Matches. Actual: no match **[probed]**. | ⚠ needs-check |
| SEARCH-10 | Arabic variants `احمد`/`أحمد`, ة/ه, tashkeel | Defined normalization. Actual: exact code-point only **[probed]**. | ❓ decision-needed |
| SEARCH-11 | Regex chars `( [ \ *` | Literal (`includes`), no crash. | |
| SEARCH-12 | Double internal space | No match vs single-spaced name **[probed]**. | |
| SEARCH-13 | Delete last match with a filter active | Shows `noResults`, not `noMembers`. | |
| SEARCH-14 | 500–1000 members, typing fast | ≤200 ms (NFR-14). Actual: no virtualization, re-renders every card. | ⚠ needs-check |
| SEARCH-15 | >1000 members in DB | All searchable. Actual: only first 1000 loaded (see X-08). | ⚠ needs-check |
| SEARCH-16 | Search across blur/focus + token refresh | Retained; cleared on sign-out. | |
| SEARCH-17 | Arabic IME composition | No mid-composition flicker. | |

## 4. DELETE (`DEL-`)

| ID | Trigger | Expected correct behavior | Flag |
|---|---|---|---|
| DEL-01 | Click trash | Dialog names the member; no DELETE yet. | |
| DEL-02 | Cancel | Closes, member remains, no request. | |
| DEL-03 | Escape | Same as Cancel. | |
| DEL-04 | Click backdrop | SRS FR-24 says it closes. Actual: Radix AlertDialog ignores outside clicks → stays open. Decide correct behavior. | ⚠ needs-check |
| DEL-05 | Confirm | Row leaves immediately, DELETE sent, success toast after ack, count −1. | |
| DEL-06 | Confirm path (`Action` + `onOpenChange(false)` → `onCancel`) | Exactly one DELETE, no cancel side effects. | ⚠ needs-check |
| DEL-07 | Double-click Confirm / click during fade-out | One DELETE (guarded by `deleteTarget`). | |
| DEL-08 | Offline at Confirm | Row disappears then reappears at original index + red toast. | |
| DEL-09 | Slow network / tab closed mid-DELETE | Gone locally before commit; success toast waits for ack. Verify no phantom on reload. | ⚠ needs-check |
| DEL-10 | Row already deleted (other staff / auto-delete) | Treat "already gone" as success. Actual: 0 rows thrown as error, row re-inserted locally, "Couldn't save"; retry loops until reload. | ⚠ needs-check |
| DEL-11 | RLS denies delete | Rollback + error (correct); message generic. | |
| DEL-12 | Delete the last member | `noMembers` state. | |
| DEL-13 | Delete with a search filter active | List + badge update correctly. | |
| DEL-14 | Keyboard: Tab to trash, Enter | Trash visible on focus-within; focus trapped; Tab cycles Cancel/Delete. | |
| DEL-15 | Focus after a confirmed delete | Sensible focus. Actual: opener removed → focus falls to `<body>`. | ⚠ needs-check |
| DEL-16 | Focus after Cancel/Escape | Returns to the same trash button. | |
| DEL-17 | Touch device | Trash always visible; hover pointer reveals on hover/focus. | |
| DEL-18 | Unbroken 100-char name in dialog | Wraps/truncates. Actual: no `break-words` → may overflow. | ⚠ needs-check |
| DEL-19 | Three quick deletes, one fails | Only the failed one restored, at a clamped index. | ⚠ needs-check |
| DEL-20 | Sign out right after Confirm | Late rollback ignored (uid guard). | |
| DEL-21 | Reload after delete | Member gone (hard delete, NFR-11). | |

## 5. SENT STATUS and BROADCAST (`BCAST-`)

| ID | Trigger | Expected correct behavior | Flag |
|---|---|---|---|
| BCAST-01 | Open Broadcast | Full-screen dialog, focus moves in; Escape/X closes and returns focus. | |
| BCAST-02 | Zero members | Empty state. Actual: reads "No members found matching your search" though no search exists. | ⚠ needs-check |
| BCAST-03 | Start gating: 0 selected / whitespace message | Start disabled. Actual: with N selected + empty message, label says "Start broadcast to N" while disabled, no hint. | ⚠ needs-check |
| BCAST-04 | Character counter | Live; counts UTF-16 (emoji = 2). | |
| BCAST-05 | Very long message (5–10k chars) | A limit/warning. Actual: no max; long `?text=` may fail in WhatsApp. | ⚠ needs-check |
| BCAST-06 | `{name}` once/several times | Replaced with first name; `Hi{name}!` too. | |
| BCAST-07 | Message without `{name}` | Sent verbatim. | |
| BCAST-08 | `{Name}`/`{NAME}`/`{ name }` typos | Warn or replace. Actual: not replaced → literal `{Name}` sent **[probed]**. | ⚠ needs-check |
| BCAST-09 | Name contains `$&`/`$1` | Inserted literally (function replacer) **[probed]**. | |
| BCAST-10 | First-name on `عبد الله`, `عبد الرحمن العتيبي`, `Dr. Ahmed` | Natural first name. Actual: "عبد", "عبد", "Dr." **[probed]** — compound Arabic names cut. | ❓ decision-needed |
| BCAST-11 | Newline/emoji/`%`/`&`/`#` | Percent-encoded correctly **[probed]**. | |
| BCAST-12 | Filters Not-sent (default) / Sent with counts | List + counts match; switching keeps selection. | |
| BCAST-13 | Select in one filter, switch, Start | Start uses only visible recipients. Actual: uses all selected ids incl. hidden ones. | ⚠ needs-check |
| BCAST-14 | Select all shown, then Clear | Acts on shown list; 0 shown is a no-op. | |
| BCAST-15 | Queue order | Follows list order (newest first), not selection order. Confirm. | ❓ decision-needed |
| BCAST-16 | Start via keyboard Enter | Focus lands on "Open & send", not Skip. | |
| BCAST-17 | Hold Enter (auto-repeat) on Start / Open & send | One recipient per deliberate press (FR-45). Actual: repeated keydown fires repeated clicks → rapid-fire, no review. | ⚠ needs-check |
| BCAST-18 | Double-click Open & send / Skip | One recipient. Actual: click 1 advances, same button takes click 2 → member 2 opened unreviewed. | ⚠ needs-check |
| BCAST-19 | Open & send | `window.open` synchronous; optimistic Sent; progress advances; Sent +1. | |
| BCAST-20 | Skip | Advances only; no status change. | |
| BCAST-21 | Skip everyone | Summary "0 of N". | |
| BCAST-22 | Web mode URL | `web.whatsapp.com/send?phone=966…&text=…` with `noopener,noreferrer`. | |
| BCAST-23 | Desktop `window.open("whatsapp://…","_blank")` | Opens app cleanly. Actual: may leave a blank tab / protocol prompt; iOS Safari may error; per-card uses `location.href` (inconsistent). | ⚠ needs-check |
| BCAST-24 | Number not on WhatsApp / app missing / Web not logged in | No false "Sent". Actual: still marked Sent ("opened", Q2). | ❓ decision-needed |
| BCAST-25 | ≥5 recipients on WhatsApp Web | One reused tab. Actual: a new tab each → "open in another window" on all but one. | ⚠ needs-check |
| BCAST-26 | Popup blocked | Staff told. Actual: `noopener` returns null → undetectable, still marked Sent. | ⚠ needs-check |
| BCAST-27 | Escape mid-run | Stops; sent members stay Sent. Actual: selection still includes them → Start again re-sends. | ⚠ needs-check |
| BCAST-28 | Backdrop click on step dialog | Ignored (by design). Verify. | |
| BCAST-29 | Escape on summary | Behaves like Done. | |
| BCAST-30 | Mark-sent fails (offline) | Badge reverts + red toast; but chat already opened; summary still "opened and sent"; member re-sendable. | ⚠ needs-check |
| BCAST-31 | Recipient purged/deleted elsewhere (0-row update) | Same rollback+error as BCAST-30; chat still opened to an erased member (PDPL). | ⚠ needs-check |
| BCAST-32 | List loaded hours ago, broadcast now | Recipients still exist. Actual: past-retention members still listed/messageable until reload. | ⚠ needs-check |
| BCAST-33 | Two staff broadcast at once | No double-messaging. Actual: Sent flags not synced → both message the same members. | ⚠ needs-check |
| BCAST-34 | Reset sent | Visible only when ≥1 Sent. Actual: one click, no confirm, global for all staff, icon-only on mobile → an accidental tap re-arms everyone. | ⚠ needs-check |
| BCAST-35 | Reset request fails | Previously-Sent restored + red toast. | |
| BCAST-36 | Reset under RLS denial | An error. Actual: 0-row UPDATE, no error, no row-count check → UI shows all reset, DB unchanged. | ⚠ needs-check |
| BCAST-37 | Staff A resets while B mid-campaign | Defined behavior; B's earlier sent flags lost. | ❓ decision-needed |
| BCAST-38 | Completion summary | "X of N" = Open&send clicks; Done clears + closes. Actual: wording overclaims (Q2); message text retained → next campaign prefilled. | ❓ decision-needed |
| BCAST-39 | Close and reopen panel | Message/filter/selection persist; step state resets. | |
| BCAST-40 | 500–1000 members, typing in textarea | Responsive. Actual: each keystroke re-renders every recipient button. | ⚠ needs-check |
| BCAST-41 | Broadcast to hundreds in minutes | Pacing/policy decision (WhatsApp ban risk, NFR-13, Q8 consent). | ❓ decision-needed |
| BCAST-42 | Unbroken 100-char name in step card | Truncates. Actual: no `min-w-0`/`truncate` → may overflow. | ⚠ needs-check |
| BCAST-43 | Arabic UI: `{name}` hint + phone | Braces + `+` read correctly. Actual: mirrored braces `}name{`; `+966…` no `<bdi dir="ltr">`. | ⚠ needs-check |
| BCAST-44 | Step preview | Shows the exact personalized text (`whitespace-pre-wrap`). | |
| BCAST-45 | Sign out mid-compose | Message/selection gone (panel unmounts). Expected. See LOGIN-18. | |
| BCAST-46 | Broadcast opened while loading / after failed load | Recipient list empty with no explanation. | ⚠ needs-check |

## 6. SETTINGS and PREFERENCES (`SET-`)

| ID | Trigger | Expected correct behavior | Flag |
|---|---|---|---|
| SET-01 | Open settings | Side sheet, focus moves in; Escape/X/overlay closes + returns focus. | |
| SET-02 | Theme Light/Dark | Immediate; persists; `<html>` class toggles; reload keeps. | |
| SET-03 | Light theme, hard reload | No flash of dark. Actual: `<html class="dark">` static in layout → light users may see a dark flash. | ⚠ needs-check |
| SET-04 | Switch to Arabic | ~410 ms transition, then `dir=rtl`, `lang=ar`, persisted, whole UI mirrors. | |
| SET-05 | Rapid EN/AR toggling | Extra clicks ignored during transition; ends consistent. | |
| SET-06 | Language switch while sheet open | Sheet stays put. Actual: `side` flips right→left mid-animation. | ⚠ needs-check |
| SET-07 | Toast visible during language switch | Stays. Actual: toast inside the transformed wrapper ~410 ms → may jump. | ⚠ needs-check |
| SET-08 | WhatsApp Web/Desktop | Persists; drives card button + broadcast. | |
| SET-09 | Fresh browser | Defaults: dark, English, Web. | |
| SET-10 | localStorage tampered (`lang="fr"`, empty, huge, `<script>`) | Falls back to defaults, no crash. | |
| SET-11 | localStorage blocked / over quota | Reads/writes caught; prefs work in-session, don't persist, no crash. | |
| SET-12 | Clear site data | Defaults + signed out. | |
| SET-13 | Two tabs: change language in A | B unchanged until reload (no storage listener); B's later change overwrites. | ⚠ needs-check |
| SET-14 | Sign out, another staff signs in | Prefs per-browser, not per-user. Confirm fine on shared PC. | ❓ decision-needed |
| SET-15 | JS disabled / slow hydration | Something visible. Actual: `AppProvider` returns null until mounted → blank page. | ⚠ needs-check |
| SET-16 | Settings in Arabic | Sheet anchors inline-end (left). | |
| SET-17 | Auto-delete window UI (FR-50) | Not in v1. No user can view/change retention. | ❓ decision-needed |

## 7. AUTO-DELETE (`AUTO-`)

| ID | Trigger | Expected correct behavior | Flag |
|---|---|---|---|
| AUTO-01 | Default 72 h, job at :00 UTC hourly | 71h59m kept; 72h01m removed next :00. Effective life 72–73 h. | |
| AUTO-02 | Row reaches window while list open | Row disappears. Actual: stays (no refetch) as a ghost until reload. | ⚠ needs-check |
| AUTO-03 | Delete a ghost row | Idempotent success. Actual: error + local resurrection (DEL-10). | ⚠ needs-check |
| AUTO-04 | Mark-sent on a ghost | Clean failure. Actual: rollback + error (BCAST-31). | ⚠ needs-check |
| AUTO-05 | Open a ghost's WhatsApp chat | Blocked. Actual: works → an erased member is messaged. | ⚠ needs-check |
| AUTO-06 | Re-add a ghost's phone | Allowed. Actual: blocked by client dup check (ADD-28). | ⚠ needs-check |
| AUTO-07 | Member purged mid-campaign | Defined behavior. Actual: queue snapshot keeps them; mark-sent fails (Q3). | ❓ decision-needed |
| AUTO-08 | Retention counts from `created_at`, not send time | Sent history lost after 3 days. Confirm intended. | ❓ decision-needed |
| AUTO-09 | pg_cron disabled / erroring / project paused | Alert. Actual: nothing deleted silently; on resume a mass delete runs. | ⚠ needs-check |
| AUTO-10 | Run `schema.sql` on the live DB | All constraints/policies/cron exist after. If `create extension pg_cron` errors mid-script, the editor may roll back everything. Verify every object. | ⚠ needs-check |
| AUTO-11 | Settings window values | Only 7/24/48/72 h. Actual: "7" ambiguous (h vs days); function treats ≤0 as off while CHECK forbids 0. | ❓ decision-needed |
| AUTO-12 | Staff JWT: `rpc('cleanup_old_members')` / update `created_at` / backdated insert | Permission error each. | |
| AUTO-13 | Deleted PII vs backups / PITR | Deleted rows may persist in backups (PDPL). | ❓ decision-needed |
| AUTO-14 | Client clock / timezone skew | No effect: `created_at` is server `now()`, job runs UTC. | |

## 8. CROSS-CUTTING (`X-`)

| ID | Trigger | Expected correct behavior | Flag |
|---|---|---|---|
| X-01 | Offline matrix (sign-in, load, add, delete, mark-sent, reset, sign-out) | No uncaught error; a localized message each. Actual: sign-in "wrong password", load misleading empty, sign-out silent. | ⚠ needs-check |
| X-02 | Members fetch fails | Error + Retry (FR-8). Actual: toast, then "No members yet" → staff may think data wiped and re-add. | ⚠ needs-check |
| X-03 | Supabase project paused | "Service paused" message. Actual: cached session opens app with empty list; login "wrong password" (Q9). | ⚠ needs-check |
| X-04 | Request hangs (no timeouts) | Timeout + error. Actual: infinite "Loading…/Adding…/Signing in…". | ⚠ needs-check |
| X-05 | PostgREST 5xx | Localized generic error. | |
| X-06 | RLS denies (pending / no profile) | Explicit "no access". Actual: silent empty list + generic write errors. | ⚠ needs-check |
| X-07 | `signOut()` / `getSession()` throws | No unhandled rejection. Actual: neither has a `catch`. | ⚠ needs-check |
| X-08 | >1000 members | All load, or a notice. Actual: silent truncation to first 1000 (NFR-21). | ⚠ needs-check |
| X-09 | Two staff on the same list | Changes visible. Actual: no realtime/refetch → adds/deletes/Sent invisible until reload. | ⚠ needs-check |
| X-10 | Two staff add the same phone at once | One row; other gets "Number already exists". | |
| X-11 | Two staff delete the same member | Both succeed cleanly. Actual: second gets error + ghost (DEL-10). | ⚠ needs-check |
| X-12 | Scroll 500px, open delete/settings/broadcast/step/toast | All anchored to viewport (B1). Re-test after a language switch. | ⚠ needs-check |
| X-13 | Close overlays after scrolling | Scroll position preserved; no scroll-lock shift. | |
| X-14 | Toast (`fixed top-4 end-4 z-[100]`) over the header | Doesn't block controls. Actual: likely covers Broadcast/Settings/Sign-out for 3s and swallows clicks. Verify 360px + desktop. | ⚠ needs-check |
| X-15 | Rapid toasts | Single slot, latest wins, newest gets full 3s; SR announcements correct. | |
| X-16 | EN/AR key parity | `tsc` enforces. Dead strings remain; hard-coded `alt="GymConnect Logo"`. | ⚠ needs-check |
| X-17 | Full RTL sweep (every screen in Arabic) | Logical properties, correct header order, progress direction, toast inline-end. | ⚠ needs-check |
| X-18 | Bidi Arabic phone `+966 …` (cards, list, dialog) | Reads `+966 55 123 4567` in visual order. Actual: no `<bdi dir="ltr">` (NFR-33). | ⚠ needs-check |
| X-19 | Width 360px | No horizontal scroll; header/cards/broadcast usable. | ⚠ needs-check |
| X-20 | Zoom 200% / large text | Usable, no clipped controls. | |
| X-21 | iOS Safari / Android Chrome handoff | Works. Depends on Q10 (reception device). | ❓ decision-needed |
| X-22 | XSS strings in name/message | Text only; message `encodeURIComponent`-ed. | |
| X-23 | PII hygiene | localStorage holds only 3 prefs + auth token; no name/phone in console/URLs/analytics. | |
| X-24 | Production build | Succeeds with env vars (`ignoreBuildErrors:false`); Analytics prod-only; 3 headers present; iframing blocked. | |
| X-25 | Anon + staff API tests | Anon reads nothing; staff cannot edit name/phone/`created_at`, `profiles`, `settings`. | |
| X-26 | Keyboard-only + screen reader | Every action reachable, visible focus; toasts announced; dialogs labelled. | |
| X-27 | Reduced-motion preference | Language transition skipped/shortened. Actual: no `prefers-reduced-motion` handling. | ⚠ needs-check |

---

## 🔴 Highest-risk — do not ship without handling

1. **Stale list → actions on erased members.** The list loads once and never refreshes (AUTO-02..06, DEL-10, BCAST-31/32). Delete on an auto-deleted/other-staff-deleted row throws, resurrects a ghost locally, and loops on retry. WhatsApp still opens to purged members (PDPL). A ghost also blocks re-adding the same phone. **Fix:** treat a 0-row delete as success; refetch on Broadcast open and on tab focus.
2. **Reset-sent: no confirm, global, no cross-staff sync** (BCAST-33/34/36). One mistaken tap re-arms every member; two staff double-message; RLS-denied reset reports false success.
3. **Step-through can rapid-fire unreviewed messages** (BCAST-17/18) — Enter auto-repeat + double-click on the same button.
4. **Staff onboarding is undefined** (LOGIN-13/14/25/26). New accounts are `pending` and see an empty app; invite links auto-log-in with no password set; recovery is dashboard/SQL only.
5. **Failure states show the wrong message** (LOGIN-10/11/12, X-01..04). Paused project / offline reads "Wrong email or password"; failed load reads "No members yet"; no Retry, no timeouts.
6. **Phone entry rejects the formats staff paste** (ADD-20/21/22/24, SEARCH-07). `0551…` and `+966…` truncated to wrong digits; search doesn't normalize; expat numbers can't be stored (Q5).
7. **Hidden/stale selections get messaged** (BCAST-13/27).
8. **Sign-out fails silently offline** (LOGIN-20) — session stays alive on a shared PC.
9. **Deploy/setup traps** (LOGIN-27, AUTO-09/10) — missing env vars crash on import; a partial `schema.sql` run could leave RLS/cron missing.
10. **Message-quality defects** — `{Name}` typos sent literally (BCAST-08); compound Arabic names cut to "عبد" (BCAST-10); WhatsApp Web opens a tab per recipient (BCAST-25); toast likely covers header buttons (X-14).

*Signed: Scenario Mapper*
