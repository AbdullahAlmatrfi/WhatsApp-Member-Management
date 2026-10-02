// Member-name rules. Reception often just needs a quick label — a single
// character or even a number like "1" is a perfectly valid name here (they add
// someone, send one WhatsApp, then delete). So the only real job is to reject a
// name that is empty / invisible, and to tidy spacing — never to demand a
// "real" full name.

// Zero-width + BOM + bidi-control characters: invisible or display-spoofing.
// Stripped so a name can't be blank-looking or reorder the UI.
const INVISIBLE = /[​-‍⁠﻿‪-‮⁦-⁩]/g;
// Every other kind of unicode space → a normal space, so trimming/collapsing works.
const UNICODE_SPACE = /[   -   　]/g;

/**
 * Clean a member name for storage: drop invisible/bidi chars, normalize all
 * unicode spaces, trim the ends, collapse internal runs, and cap at 100 chars.
 * "1" stays "1"; "  Ali   Ahmed  " becomes "Ali Ahmed"; a name made only of
 * spaces or invisibles becomes "" (which `isValidName` then rejects).
 */
export function cleanName(raw: string): string {
  return raw
    .replace(INVISIBLE, "")
    .replace(UNICODE_SPACE, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

/** Valid when at least one visible character remains after cleaning. */
export function isValidName(raw: string): boolean {
  return cleanName(raw).length > 0;
}

/** Up to 2 initials for the avatar, safe for a number ("1"), a short label, or
 * an emoji first character (code-point aware, so no broken half-glyph). */
export function nameInitials(name: string): string {
  const letters = cleanName(name)
    .split(" ")
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .slice(0, 2);
  return letters.toUpperCase();
}
