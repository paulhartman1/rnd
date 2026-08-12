/**
 * Skip-Trace Import domain.
 *
 * This is a DISTINCT business concern from the BatchLeads *property import*.
 * A skip-trace report is enrichment data for an EXISTING property, not a new
 * addressable property lead. The parsing/normalization here is intentionally
 * duplicated from the property import pipeline: the logic may look similar
 * today, but it is expected to diverge as the two concerns evolve
 * independently. Do not "DRY up" by sharing with bulk-import.
 */

import * as XLSX from "xlsx";

export type CSVRow = Record<string, string | number | boolean>;

// ---------------------------------------------------------------------------
// CSV / Excel parsing (duplicated on purpose — see file header)
// ---------------------------------------------------------------------------

export function parseSkipTraceExcel(buffer: ArrayBuffer): CSVRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as CSVRow[];
}

export function parseSkipTraceCSV(csvText: string): CSVRow[] {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const headers = firstLine
    .split(delimiter)
    .map((h) => h.trim().replace(/^"|"$/g, ""));

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
      .split(delimiter)
      .map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Field extraction (resilient to common BatchLeads header variants)
// ---------------------------------------------------------------------------

function firstNonEmpty(
  row: CSVRow,
  keys: string[],
): string | null {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return null;
}

export function extractState(row: CSVRow): string | null {
  return firstNonEmpty(row, ["Property State", "State", "property_state"]);
}

export function extractCounty(row: CSVRow): string | null {
  return firstNonEmpty(row, ["Property County", "County", "property_county"]);
}

export function extractApn(row: CSVRow): string | null {
  return firstNonEmpty(row, ["APN", "Apn", "apn", "Parcel Number", "Parcel"]);
}

/** Phone/type/dnc triples present in BatchLeads skip-trace exports. */
export type ExtractedPhone = {
  number: string;
  type: string | null;
  dnc: boolean;
};

export function extractPhones(row: CSVRow): ExtractedPhone[] {
  const phones: ExtractedPhone[] = [];
  for (let i = 1; i <= 5; i++) {
    const number = firstNonEmpty(row, [`Phone ${i}`, `phone_${i}`]);
    if (!number) continue;
    const type = firstNonEmpty(row, [`Phone ${i} TYPE`, `Phone ${i} Type`]);
    const dncRaw = firstNonEmpty(row, [`Phone ${i} DNC`]);
    phones.push({
      number,
      type,
      dnc: dncRaw ? /^(true|yes|1)$/i.test(dncRaw) : false,
    });
  }
  return phones;
}

export function extractEmails(row: CSVRow): string[] {
  const emails: string[] = [];
  const e1 = firstNonEmpty(row, ["Email", "email"]);
  const e2 = firstNonEmpty(row, ["Email 2", "email_2"]);
  if (e1) emails.push(e1);
  if (e2) emails.push(e2);
  return emails;
}

export function extractOwnerName(row: CSVRow): string | null {
  const first = firstNonEmpty(row, ["First Name", "first_name"]);
  const last = firstNonEmpty(row, ["Last Name", "last_name"]);
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || null;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** State: trim + uppercase. */
export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  const trimmed = state.trim().toUpperCase();
  return trimmed || null;
}

/** County: trim, lowercase, strip a trailing " county" suffix. */
export function normalizeCounty(
  county: string | null | undefined,
): string | null {
  if (!county) return null;
  const trimmed = county
    .trim()
    .toLowerCase()
    .replace(/\s+county$/i, "")
    .trim();
  return trimmed || null;
}

/**
 * APN: trim, remove all non-alphanumeric characters, uppercase.
 * Conservative: only strips separators/whitespace; never reorders or drops
 * meaningful alphanumeric content. Keep the raw value separately for provenance.
 */
export function normalizeApn(apn: string | null | undefined): string | null {
  if (!apn) return null;
  const normalized = apn.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return normalized || null;
}

/** Phone: digits only, strip a leading US country code (1) when 11 digits. */
export function normalizePhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
}

/** Email: trim + lowercase for dedup comparison. */
export function normalizeEmail(
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

/** Composite match key: "STATE|county|APN". Null if any component missing. */
export function buildMatchKey(
  stateNorm: string | null,
  countyNorm: string | null,
  apnNorm: string | null,
): string | null {
  if (!stateNorm || !countyNorm || !apnNorm) return null;
  return `${stateNorm}|${countyNorm}|${apnNorm}`;
}

// ---------------------------------------------------------------------------
// Row classification
// ---------------------------------------------------------------------------

export type NormalizedSkipTraceRow = {
  raw: CSVRow;
  stateRaw: string | null;
  countyRaw: string | null;
  apnRaw: string | null;
  stateNorm: string | null;
  countyNorm: string | null;
  apnNorm: string | null;
  matchKey: string | null;
  phones: ExtractedPhone[];
  emails: string[];
  ownerName: string | null;
  malformed: boolean;
  malformedReason: string | null;
};

/**
 * Normalize a raw skip-trace row into the shape used for matching.
 * A row is "malformed" for matching purposes if it lacks any of
 * state / county / APN (the match key cannot be built).
 */
export function normalizeSkipTraceRow(row: CSVRow): NormalizedSkipTraceRow {
  const stateRaw = extractState(row);
  const countyRaw = extractCounty(row);
  const apnRaw = extractApn(row);

  const stateNorm = normalizeState(stateRaw);
  const countyNorm = normalizeCounty(countyRaw);
  const apnNorm = normalizeApn(apnRaw);
  const matchKey = buildMatchKey(stateNorm, countyNorm, apnNorm);

  const missing: string[] = [];
  if (!apnNorm) missing.push("APN");
  if (!stateNorm) missing.push("state");
  if (!countyNorm) missing.push("county");

  return {
    raw: row,
    stateRaw,
    countyRaw,
    apnRaw,
    stateNorm,
    countyNorm,
    apnNorm,
    matchKey,
    phones: extractPhones(row),
    emails: extractEmails(row),
    ownerName: extractOwnerName(row),
    malformed: missing.length > 0,
    malformedReason:
      missing.length > 0 ? `Missing ${missing.join(", ")}` : null,
  };
}

/**
 * Normalized key for a persisted batchleads-style record, so callers can
 * bucket raw property rows by the same key used for skip-trace rows.
 */
export function batchLeadMatchKey(record: {
  property_state: string | null;
  property_county: string | null;
  apn: string | null;
}): string | null {
  return buildMatchKey(
    normalizeState(record.property_state),
    normalizeCounty(record.property_county),
    normalizeApn(record.apn),
  );
}

export type SkipTraceMatchStatus =
  | "matched"
  | "matched_no_lead"
  | "unmatched"
  | "ambiguous"
  | "malformed";

/**
 * Resolve a match outcome given the batchleads rows that share the key and the
 * distinct set of lead ids they resolve to.
 *
 * Ambiguity is defined at the RESOLVED TARGET level: more than one distinct
 * lead. Multiple raw batchleads rows that resolve to a single lead (re-import
 * duplicates) are NOT ambiguous.
 */
export function resolveMatchStatus(
  batchLeadCount: number,
  distinctLeadIds: string[],
): SkipTraceMatchStatus {
  if (batchLeadCount === 0) return "unmatched";
  if (distinctLeadIds.length > 1) return "ambiguous";
  if (distinctLeadIds.length === 1) return "matched";
  return "matched_no_lead";
}
