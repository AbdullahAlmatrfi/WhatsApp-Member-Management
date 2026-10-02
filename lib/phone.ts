// One home for every phone rule, shared by add / search / storage — so the app
// never disagrees with itself about what a number is. Saudi mobile only for now
// (expat/non-Saudi numbers are a pending product decision, tracked in the
// checklist). Stored form is the 12-digit E.164-without-plus "966" + national.

const NATIONAL = /^5\d{8}$/; // national form: 9 digits starting with 5

/** Arabic-Indic (٠-٩), Persian (۰-۹), and full-width (０-９) digits → ASCII. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹０-９]/g, (d) => {
    const code = d.charCodeAt(0);
    if (code >= 0xff10) return String(code - 0xff10); // full-width
    if (code >= 0x06f0) return String(code - 0x06f0); // Persian
    return String(code - 0x0660); // Arabic-Indic
  });
}

/**
 * Turn any way a Saudi mobile is written into the canonical 9-digit national
 * form (`5XXXXXXXX`), or null if it isn't a valid Saudi mobile. Handles the
 * real ways people paste numbers: `+966…`, `00966…`, a leading trunk `0`
 * (`0551234567`), spaces/dashes, and Arabic/Persian/full-width digits.
 */
export function parseSaudiMobile(raw: string): string | null {
  let d = toAsciiDigits(raw).replace(/\D/g, "");
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  if (d.length === 10 && d.startsWith("0")) d = d.slice(1); // trunk 0
  return NATIONAL.test(d) ? d : null;
}

/** True when `national` is a valid 9-digit Saudi mobile. */
export function isValidSaudiMobile(national: string): boolean {
  return NATIONAL.test(national);
}

/** National 9-digit → the stored 12-digit form ("966" + national). */
export function toStoredPhone(national: string): string {
  return `966${national}`;
}

/**
 * Live sanitizer for the add-member input: if the current value is already a
 * full/parseable number, snap it to the national form (so a pasted `+966…` or
 * `0551…` self-corrects); otherwise keep the digits typed so far (max 9).
 */
export function sanitizePhoneInput(raw: string): string {
  const parsed = parseSaudiMobile(raw);
  if (parsed) return parsed;
  // Fallback for a partial number mid-typing. Strip a country-code / trunk
  // prefix BEFORE capping at 9 digits, so typing "+966 5…" by hand doesn't get
  // stuck at "966551234" and never reach a valid national number.
  let d = toAsciiDigits(raw).replace(/\D/g, "");
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  if (d.length === 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 9);
}

/**
 * Does a stored phone match a search query? The query is normalized the same
 * way (Arabic/Persian/full-width → ASCII, punctuation dropped), then matched
 * against the stored form, the bare national form, and the `0`-trunk form — so
 * searching `0551…`, `+966 55…`, `٥٥١`, or a partial `5512` all find the member.
 */
export function phoneMatches(storedPhone: string, query: string): boolean {
  const q = toAsciiDigits(query).replace(/\D/g, "");
  if (!q) return false;
  const national = storedPhone.startsWith("966") ? storedPhone.slice(3) : storedPhone;
  if (storedPhone.includes(q) || national.includes(q) || `0${national}`.includes(q)) {
    return true;
  }
  // A fully-written query (e.g. "00966…" / "+966…") that doesn't substring-match
  // above still matches if it parses to this member's national number.
  const parsed = parseSaudiMobile(query);
  return parsed !== null && parsed === national;
}
