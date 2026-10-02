// Shared formatting helpers. Dates are computed in the gym's local time
// (Asia/Riyadh) so every staff device agrees on "Today"/"Yesterday" regardless
// of the device timezone, and day labels use calendar days (not elapsed 24h).

function riyadhYMD(d: Date): string {
  // en-CA formats as YYYY-MM-DD; the timeZone pins it to gym-local.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function riyadhDayDiff(from: Date, to: Date): number {
  const [fy, fm, fd] = riyadhYMD(from).split("-").map(Number);
  const [ty, tm, td] = riyadhYMD(to).split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** YYYY-MM-DD in gym-local time — used for the export filename. */
export function todayRiyadhStamp(): string {
  return riyadhYMD(new Date());
}

/** YYYY-MM-DD (ISO) in gym-local time; "" when the date is missing/invalid.
 * ISO is unambiguous across locales (no DD/MM vs MM/DD confusion in Excel). */
export function formatDateRiyadh(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

type AddedStrings = {
  added: string;
  addedToday: string;
  addedYesterday: string;
  addedTwoDays: string;
  addedDaysAgo: string;
  leavingSoon: string;
};

export type AddedTag = { text: string; leavingSoon: boolean } | null;

/**
 * The "Added" tag for a member card.
 * - text: Today / Yesterday / "{n} days" (calendar days, gym-local).
 * - leavingSoon: within the last stretch before auto-delete removes it.
 * Returns null when there's no usable date (never crashes on bad input).
 */
export function addedTag(
  createdAt: string | null | undefined,
  retentionHours: number,
  t: AddedStrings
): AddedTag {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (isNaN(created.getTime())) return null;
  const now = new Date();

  const elapsedHours = Math.max(0, (now.getTime() - created.getTime()) / 3_600_000);
  const remaining = retentionHours - elapsedHours;
  // "About to be auto-deleted": within 24h of the window (or the last third of a short window).
  const leavingSoon = remaining <= Math.min(24, retentionHours / 3);

  const dayDiff = Math.max(0, riyadhDayDiff(created, now)); // clamp future/skew to Today
  let when: string;
  if (dayDiff === 0) when = t.addedToday;
  else if (dayDiff === 1) when = t.addedYesterday;
  else if (dayDiff === 2) when = t.addedTwoDays; // Arabic dual (يومين) differs from plural
  else when = t.addedDaysAgo.replace("{n}", String(dayDiff)); // Western digits (house style)
  return { text: `${t.added} ${when}`, leavingSoon };
}
