// Membership expiry helpers.
// Status is derived from the member's expiry date relative to today.

export type MembershipStatus = "expired" | "soon" | "active";

// "soon" = expiring within this many days (inclusive)
export const EXPIRING_SOON_DAYS = 7;

/**
 * Returns the membership status for a given expiry date (ISO "yyyy-mm-dd"),
 * or null when no expiry date is set.
 */
export function membershipStatus(expiry?: string): MembershipStatus | null {
  if (!expiry) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(expiry);
  if (isNaN(exp.getTime())) return null;
  exp.setHours(0, 0, 0, 0);

  const days = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "soon";
  return "active";
}

/** Human-readable expiry date, e.g. "02 Oct 2026". Empty string when unset. */
export function formatExpiry(expiry?: string): string {
  if (!expiry) return "";
  const d = new Date(expiry);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
