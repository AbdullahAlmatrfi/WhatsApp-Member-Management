# GymConnect — Design Rules 🎨

**Every new feature must follow this. No off-brand colors.**

## Colors (from `app/globals.css` — use the token, not the hex)
- **Primary / brand green** `--primary` = `#047857` → all main buttons & fills with white text, active states. Darkened from the old `#10b981` so **white-on-green passes WCAG AA** (5.49:1; `#10b981` was only 2.54:1 = fail).
- **Green AS TEXT / icon** `--primary-accent` → use `text-primary-accent`, NOT `text-primary`, whenever green is the text/icon color (chips, stat figures, links). It's `#047857` in light and a lighter `#34d399` in dark, so green text stays readable on both backgrounds.
- **Text** `--foreground` · **Muted text** `--muted-foreground` (light = `#475569`, darkened for AA on chips)
- **Card / surface** `--card`, `--secondary` · **Border** `--border` · **Input** `--input`
- **Danger only** `--destructive` = `#dc2626` (delete/errors) — never as decoration (darkened from `#ef4444` for AA white-on-red)
- ❌ No new colors (no yellow/orange/purple/blue). Green is the accent. Period.
- **Rule:** green fill + white text → `bg-primary` / `text-primary-foreground`. Green text on a light/tinted surface → `text-primary-accent`. Never white text on `#10b981`.

## Type
- Font: **Geist** (sans), **Geist Mono** (code). Don't add fonts.

## Shape & feel
- Corners: `--radius` = `0.75rem` (rounded-xl/2xl on cards)
- Cards: soft border + subtle shadow, generous padding
- Buttons: green fill (`--primary` #047857), white text, slight hover lift
- Works in **dark + light**, and **English + Arabic (RTL)** — use `start/end`, not `left/right`

## Rule of thumb
If a new button/card doesn't look like the ones already in the app → it's wrong. Match, don't invent.
