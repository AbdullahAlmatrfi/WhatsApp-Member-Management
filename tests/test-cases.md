# GymConnect Test Cases

## Scope
- App functional behavior
- Validation and UX states
- Security injection scenarios
- Supabase/database and failure states

## Environment
- Local app URL: `http://localhost:3000`
- Supabase table: `public.members`
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Functional Cases

### TC-FN-001: Initial load with existing members
- Preconditions: `members` table has records.
- Steps:
  1. Open app.
- Expected:
  - Loading state appears briefly.
  - Members render sorted by latest `created_at` first.

### TC-FN-002: Initial load with empty members table
- Preconditions: `members` table is empty.
- Steps:
  1. Open app.
- Expected:
  - Empty-state message appears.
  - No member cards displayed.

### TC-FN-003: Search by member name
- Preconditions: At least one known name in table.
- Steps:
  1. Type partial name in search input.
- Expected:
  - Only matching member cards are displayed.

### TC-FN-004: Search by phone
- Preconditions: At least one known phone in table.
- Steps:
  1. Type partial phone digits in search input.
- Expected:
  - Only matching member cards are displayed.

### TC-FN-005: No search results
- Preconditions: Members exist.
- Steps:
  1. Enter random query with no match.
- Expected:
  - No-results message is shown.

### TC-FN-006: Add member success (9-digit local format)
- Preconditions: Use unique phone.
- Steps:
  1. Enter valid name.
  2. Enter 9-digit Saudi mobile part.
  3. Click add.
- Expected:
  - Success toast appears.
  - New card appears at top.
  - Stored phone is normalized with `966` prefix.

### TC-FN-007: Add member success (already has 966)
- Preconditions: Use unique phone.
- Steps:
  1. Enter valid name.
  2. Enter phone starting with `966`.
  3. Click add.
- Expected:
  - Success toast appears.
  - Number is not double-prefixed.

### TC-FN-008: Prevent duplicate phone (client-side state)
- Preconditions: Existing member with target phone already loaded.
- Steps:
  1. Add same phone again.
- Expected:
  - Duplicate warning toast appears.
  - No duplicate card added.

### TC-FN-009: Prevent duplicate phone (database unique constraint)
- Preconditions: Insert race or stale state setup.
- Steps:
  1. Trigger add for already-taken phone.
- Expected:
  - Duplicate warning path is handled.
  - No app crash.

### TC-FN-010: Delete member success
- Preconditions: At least one member exists.
- Steps:
  1. Click delete icon on member.
  2. Confirm in dialog.
- Expected:
  - Success toast appears.
  - Card is removed.
  - Row removed from Supabase.

### TC-FN-011: Delete cancel
- Preconditions: Delete dialog opened.
- Steps:
  1. Click cancel.
- Expected:
  - Dialog closes.
  - Member remains.

### TC-FN-012: WhatsApp open in web mode
- Preconditions: Preference set to `web`.
- Steps:
  1. Click WhatsApp button on a member.
- Expected:
  - Opens `https://web.whatsapp.com/send?phone=<number>`.

### TC-FN-013: WhatsApp open in desktop mode
- Preconditions: Preference set to `desktop`.
- Steps:
  1. Click WhatsApp button.
- Expected:
  - Navigates to `whatsapp://send?phone=<number>`.

## Validation and UI State Cases

### TC-UI-001: Add button disabled for empty fields
- Steps:
  1. Keep name empty and/or phone empty.
- Expected:
  - Add button disabled.

### TC-UI-002: Phone input strips non-digits
- Steps:
  1. Type letters/symbols in phone input.
- Expected:
  - Non-digits are removed.

### TC-UI-003: Phone max length
- Steps:
  1. Attempt to enter more than 9 digits.
- Expected:
  - Input is capped at configured max length.

### TC-UI-004: Add loading state
- Steps:
  1. Submit valid add form.
- Expected:
  - Spinner and adding label shown until response.

### TC-UI-005: Loading skeleton on initial fetch
- Steps:
  1. Refresh app.
- Expected:
  - Skeleton placeholders appear before data loads.

### TC-UI-006: Error toast on load failure
- Preconditions: Force API/network failure.
- Steps:
  1. Open app.
- Expected:
  - Load failure toast appears.

### TC-UI-007: Error toast on add failure
- Preconditions: Force insert failure.
- Steps:
  1. Submit valid add request.
- Expected:
  - Add failure toast appears.
  - Input values remain for retry.

### TC-UI-008: Error toast on delete failure
- Preconditions: Force delete failure.
- Steps:
  1. Confirm delete.
- Expected:
  - Delete failure toast appears.
  - Member remains visible.

## Localization and Preference Cases

### TC-L10N-001: Switch to Arabic
- Steps:
  1. Open settings.
  2. Change language to Arabic.
- Expected:
  - Arabic labels render.
  - `document.dir` becomes `rtl`.

### TC-L10N-002: Switch to English
- Steps:
  1. Change language back to English.
- Expected:
  - English labels render.
  - `document.dir` becomes `ltr`.

### TC-L10N-003: Theme persistence
- Steps:
  1. Toggle theme.
  2. Refresh page.
- Expected:
  - Selected theme remains applied.

### TC-L10N-004: WhatsApp preference persistence
- Steps:
  1. Set preference (web/desktop).
  2. Refresh.
- Expected:
  - Preference remains unchanged.

### TC-L10N-005: Language persistence
- Steps:
  1. Set language.
  2. Refresh.
- Expected:
  - Language remains unchanged.

## Security Injection Cases

### TC-SEC-001: XSS payload in name input
- Payload: `<script>alert(1)</script>`
- Steps:
  1. Submit name containing payload.
  2. Render member list.
- Expected:
  - Script does not execute.
  - Payload is rendered as plain text.

### TC-SEC-002: HTML event handler payload in name
- Payload: `<img src=x onerror=alert(1)>`
- Steps:
  1. Submit payload as name.
- Expected:
  - No JavaScript execution.

### TC-SEC-003: SQL injection string in name
- Payload: `' OR 1=1 --`
- Steps:
  1. Submit payload as name.
- Expected:
  - Treated as text value only.
  - No unauthorized data exposure or corruption.

### TC-SEC-004: SQL injection string in phone
- Payload: `9665' OR '1'='1`
- Steps:
  1. Paste payload in phone input.
- Expected:
  - Input sanitization strips non-digits.

### TC-SEC-005: Oversized input stress
- Steps:
  1. Enter very long name string (e.g., 10k chars) via paste.
- Expected:
  - App remains responsive.
  - Validation/rejection handled safely.

### TC-SEC-006: localStorage tampering
- Steps:
  1. Manually set invalid values for preference keys.
  2. Refresh app.
- Expected:
  - App falls back safely.
  - No crash.

## Database and API Reliability Cases

### TC-DB-001: RLS deny SELECT
- Preconditions: Temporarily deny select policy.
- Steps:
  1. Reload app.
- Expected:
  - Graceful load failure toast.

### TC-DB-002: RLS deny INSERT
- Preconditions: Temporarily deny insert policy.
- Steps:
  1. Try add member.
- Expected:
  - Add failure toast.
  - No local ghost entry.

### TC-DB-003: RLS deny DELETE
- Preconditions: Temporarily deny delete policy.
- Steps:
  1. Try delete member.
- Expected:
  - Delete failure toast.
  - Member remains.

### TC-DB-004: Network outage during load
- Steps:
  1. Disconnect network.
  2. Refresh app.
- Expected:
  - Graceful error handling.

### TC-DB-005: Network outage during add
- Steps:
  1. Fill valid form.
  2. Disconnect before submit.
- Expected:
  - Add failure shown.
  - No inconsistent local state.

### TC-DB-006: Concurrency duplicate add race
- Steps:
  1. Trigger two add requests with same phone nearly simultaneously.
- Expected:
  - Exactly one success.
  - Second request handled as duplicate.

### TC-DB-007: Data ordering
- Steps:
  1. Insert multiple records with different timestamps.
  2. Reload app.
- Expected:
  - Descending `created_at` order.

## Responsive and Browser Cases

### TC-RWD-001: Mobile viewport
- Steps:
  1. Test at 375x812.
- Expected:
  - No layout break or clipped controls.

### TC-RWD-002: Desktop viewport
- Steps:
  1. Test at 1440x900.
- Expected:
  - Spacing and interactions remain correct.

### TC-RWD-003: Cross-browser smoke
- Browsers: Chrome, Edge, Firefox.
- Expected:
  - Core flows work consistently.

## Exit Criteria
- All Functional and Database P0/P1 cases pass.
- All Security injection cases pass without script execution or backend abuse.
- No uncaught runtime exceptions in console during main flows.
