import type { Member } from "@/app/page";
import { formatDateRiyadh, todayRiyadhStamp } from "@/lib/format";

// Client-side CSV export of the member list — the app's simple safety net.
// Pure client, works offline, no server/secret key. Holds PII (names + phones),
// so it downloads only to the staff's own device and keeps no extra copies.

type CsvStrings = {
  csvName: string;
  csvPhone: string;
  csvStatus: string;
  csvAdded: string;
  sent: string;
  notSent: string;
};

function formatPhoneForCsv(phone: string): string {
  // Space-grouped digits so the number stays TEXT in both Excel and Google
  // Sheets — no scientific-notation mangling, and no stray leading apostrophe
  // (Sheets shows that apostrophe literally). No leading "+": the csvCell guard
  // would prefix it with an apostrophe. Anything unexpected is left untouched.
  if (!/^\d{12}$/.test(phone)) return phone;
  return `${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
}

function csvCell(value: string): string {
  let s = value ?? "";
  // Neutralize spreadsheet formula injection: a member named "=HYPERLINK(...)",
  // "+cmd", "-1", "@..." must never execute when the admin opens the file.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  // RFC-4180 quoting for commas, quotes, and newlines inside a field.
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function buildMembersCsv(members: Member[], t: CsvStrings): string {
  const header = [t.csvName, t.csvPhone, t.csvStatus, t.csvAdded].map(csvCell).join(",");
  const lines = members.map((m) =>
    [
      csvCell(m.name),
      csvCell(formatPhoneForCsv(m.phone)), // space-grouped: stays text in Excel + Sheets
      csvCell(m.sent ? t.sent : t.notSent),
      csvCell(formatDateRiyadh(m.createdAt)),
    ].join(",")
  );
  // UTF-8 BOM so Arabic names open correctly in Excel; CRLF between records.
  return "﻿" + [header, ...lines].join("\r\n");
}

export function downloadMembersCsv(members: Member[], t: CsvStrings): void {
  const blob = new Blob([buildMembersCsv(members, t)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gymconnect-members-${todayRiyadhStamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer the revoke: some browsers (older Safari/Firefox) abort the download
  // if the object URL is revoked synchronously right after click().
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
