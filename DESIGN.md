# GymConnect — Design Rules 🎨

**Every new feature must follow this. No off-brand colors.**

## Colors (from `app/globals.css` — use the token, not the hex)
- **Primary / brand green** `--primary` = `#10b981` → all main buttons, active states, accents
- **Text** `--foreground` · **Muted text** `--muted-foreground`
- **Card / surface** `--card`, `--secondary` · **Border** `--border` · **Input** `--input`
- **Danger only** `--destructive` = `#ef4444` (delete/errors) — never as decoration
- ❌ No new colors (no yellow/orange/purple/blue). Green is the accent. Period.

## Type
- Font: **Geist** (sans), **Geist Mono** (code). Don't add fonts.

## Shape & feel
- Corners: `--radius` = `0.75rem` (rounded-xl/2xl on cards)
- Cards: soft border + subtle shadow, generous padding
- Buttons: green fill, white text, slight hover lift
- Works in **dark + light**, and **English + Arabic (RTL)** — use `start/end`, not `left/right`

## Rule of thumb
If a new button/card doesn't look like the ones already in the app → it's wrong. Match, don't invent.
