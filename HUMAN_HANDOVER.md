# Human Handover Guide

## 1) What this app is now
GymConnect is a Next.js app that manages gym members and opens WhatsApp chats.
Data is now live from Supabase table: members.

## 2) Main flow to understand first
1. UI entry point: app/page.tsx
2. Data logic (fetch/add/delete): hooks/use-members.ts
3. Supabase connection and table types: lib/supabase.ts
4. Language/theme/preferences context: lib/translations.tsx

If you understand these 4 files, you understand the app.

## 3) What was added recently
- Playwright end-to-end test suites under tests/e2e
- API mock helper for deterministic tests: tests/e2e/helpers/supabase-mock.ts
- Visual HTML report for test coverage: tests/report/test-cases-report.html

## 4) Current quality status
- Latest Playwright run: all tests passing (13/13)
- Test scripts available in package.json:
  - test:e2e
  - test:e2e:headed
  - test:e2e:ui

## 5) Safe edit strategy
When changing behavior:
1. Edit UI in components or app/page.tsx
2. Edit data behavior only in hooks/use-members.ts
3. Keep Supabase table name as members unless DB changes
4. Re-run tests after each feature change

## 6) Common break points
- Missing Supabase environment variables
- Changing field names that do not match members table columns
- Breaking selector text used by Playwright tests
- Clearing localStorage logic in tests in a way that breaks persistence checks

## 7) Next best improvements
1. Add a small script to generate report HTML from test files automatically
2. Add CI step to run Playwright on every push
3. Add basic unit tests for use-members hook edge cases

## 8) Confidence rule
If you are unsure where to edit, start in app/page.tsx and trace into hooks/use-members.ts.
That path is the highest value and lowest risk.
