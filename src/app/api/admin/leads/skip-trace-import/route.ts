import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseSkipTraceCSV,
  parseSkipTraceExcel,
  normalizeSkipTraceRow,
  batchLeadMatchKey,
  resolveMatchStatus,
  normalizePhone,
  normalizeEmail,
  type CSVRow,
  type NormalizedSkipTraceRow,
} from "@/lib/skip-trace";

// A skip-trace report is enrichment for an EXISTING property. This endpoint
// never creates leads or properties, and never touches the address-visibility
// rule. It matches rows to persisted raw BatchLeads data via state+county+APN.

type BatchLeadRecord = {
  id: string;
  property_state: string | null;
  property_county: string | null;
  apn: string | null;
  phone_1: string | null;
  phone_2: string | null;
  phone_3: string | null;
  phone_4: string | null;
  phone_5: string | null;
  email: string | null;
  email_2: string | null;
};

type RowResult = {
  status: "matched" | "matched_no_lead" | "unmatched" | "ambiguous" | "malformed";
  apn: string | null;
  state: string | null;
  county: string | null;
  owner: string | null;
  reason?: string;
  candidateLeadIds?: string[];
  phonesAdded: number;
  emailsAdded: number;
  dupesIgnored: number;
};

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  let file: File | null = null;
  let dryRun = false;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File | null;
    dryRun = formData.get("dryRun") === "true";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Parse
  let rows: CSVRow[] = [];
  try {
    const fileName = file.name.toLowerCase();
    if (
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      file.type.includes("spreadsheet")
    ) {
      rows = parseSkipTraceExcel(await file.arrayBuffer());
    } else {
      rows = parseSkipTraceCSV(await file.text());
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to parse file",
        details: err instanceof Error ? err.message : "Unknown parse error",
      },
      { status: 400 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "File is empty or contains no valid data rows" },
      { status: 400 },
    );
  }

  // Normalize all rows and collect the set of match keys we need to look up.
  const normalizedRows: NormalizedSkipTraceRow[] = rows.map((r) =>
    normalizeSkipTraceRow(r),
  );
  const keys = new Set<string>();
  for (const nr of normalizedRows) {
    if (nr.matchKey) keys.add(nr.matchKey);
  }

  // Load all batchleads rows and bucket them by normalized key in JS (avoids
  // SQL-side normalization drift and keeps the normalization single-sourced).
  const { data: batchLeads, error: blError } = await admin
    .from("batchleads")
    .select(
      "id, property_state, property_county, apn, phone_1, phone_2, phone_3, phone_4, phone_5, email, email_2",
    );

  if (blError) {
    return NextResponse.json(
      { error: "Failed to load property data", details: blError.message },
      { status: 500 },
    );
  }

  const byKey = new Map<string, BatchLeadRecord[]>();
  for (const bl of (batchLeads ?? []) as BatchLeadRecord[]) {
    const key = batchLeadMatchKey(bl);
    if (!key) continue;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(bl);
    else byKey.set(key, [bl]);
  }

  // Load mappings (batchlead_id -> lead_id) for the matched batchleads.
  const allBatchLeadIds: string[] = [];
  for (const key of keys) {
    const bucket = byKey.get(key);
    if (bucket) for (const b of bucket) allBatchLeadIds.push(b.id);
  }

  const leadIdByBatchLead = new Map<string, string>();
  if (allBatchLeadIds.length > 0) {
    const { data: mappings } = await admin
      .from("batchleads_mapping")
      .select("batchlead_id, lead_id")
      .in("batchlead_id", allBatchLeadIds);
    for (const m of mappings ?? []) {
      leadIdByBatchLead.set(m.batchlead_id, m.lead_id);
    }
  }

  // Aggregate counters
  let matched = 0;
  let matchedNoLead = 0;
  let unmatched = 0;
  let ambiguous = 0;
  let malformed = 0;
  let phonesAdded = 0;
  let emailsAdded = 0;
  let dupesIgnored = 0;

  const rowResults: RowResult[] = [];

  // Create the import record up front (unless dry run) so rows can reference it.
  let importId: string | null = null;
  if (!dryRun) {
    const { data: imp, error: impErr } = await admin
      .from("skip_trace_imports")
      .insert({
        filename: file.name,
        uploaded_by: user.id,
        total_rows: rows.length,
      })
      .select("id")
      .single();
    if (impErr || !imp) {
      return NextResponse.json(
        { error: "Failed to create import record", details: impErr?.message },
        { status: 500 },
      );
    }
    importId = imp.id;
  }

  // Cache lead phone/email state we mutate during this import so repeated
  // rows in the same file dedupe against each other too.
  const leadPhoneCache = new Map<string, Set<string>>(); // leadId -> normalized digits
  const leadEmailCache = new Map<string, Set<string>>(); // leadId -> normalized emails

  async function getLeadPhoneSet(leadId: string): Promise<Set<string>> {
    const cached = leadPhoneCache.get(leadId);
    if (cached) return cached;
    const { data } = await admin!
      .from("lead_phones")
      .select("phone_number")
      .eq("lead_id", leadId);
    const set = new Set<string>();
    for (const p of data ?? []) {
      const n = normalizePhone(p.phone_number);
      if (n) set.add(n);
    }
    leadPhoneCache.set(leadId, set);
    return set;
  }

  async function getLeadEmailSet(leadId: string): Promise<Set<string>> {
    const cached = leadEmailCache.get(leadId);
    if (cached) return cached;
    const set = new Set<string>();
    const { data: lead } = await admin!
      .from("leads")
      .select("email")
      .eq("id", leadId)
      .single();
    const le = normalizeEmail(lead?.email);
    if (le) set.add(le);
    const { data: props } = await admin!
      .from("properties")
      .select("email, email2")
      .eq("lead_id", leadId);
    for (const pr of props ?? []) {
      const e1 = normalizeEmail(pr.email);
      const e2 = normalizeEmail(pr.email2);
      if (e1) set.add(e1);
      if (e2) set.add(e2);
    }
    leadEmailCache.set(leadId, set);
    return set;
  }

  for (const nr of normalizedRows) {
    // Malformed: cannot build a match key
    if (nr.malformed || !nr.matchKey) {
      malformed++;
      const result: RowResult = {
        status: "malformed",
        apn: nr.apnRaw,
        state: nr.stateRaw,
        county: nr.countyRaw,
        owner: nr.ownerName,
        reason: nr.malformedReason ?? "Malformed row",
        phonesAdded: 0,
        emailsAdded: 0,
        dupesIgnored: 0,
      };
      rowResults.push(result);
      if (!dryRun) await persistRow(nr, result, null, null);
      continue;
    }

    const bucket = byKey.get(nr.matchKey) ?? [];
    const distinctLeadIds = Array.from(
      new Set(
        bucket
          .map((b) => leadIdByBatchLead.get(b.id))
          .filter((v): v is string => Boolean(v)),
      ),
    );

    const status = resolveMatchStatus(bucket.length, distinctLeadIds);

    if (status === "unmatched") {
      unmatched++;
      const result: RowResult = {
        status,
        apn: nr.apnRaw,
        state: nr.stateRaw,
        county: nr.countyRaw,
        owner: nr.ownerName,
        reason: "No property matched state + county + APN",
        phonesAdded: 0,
        emailsAdded: 0,
        dupesIgnored: 0,
      };
      rowResults.push(result);
      if (!dryRun) await persistRow(nr, result, null, null);
      continue;
    }

    if (status === "ambiguous") {
      ambiguous++;
      const result: RowResult = {
        status,
        apn: nr.apnRaw,
        state: nr.stateRaw,
        county: nr.countyRaw,
        owner: nr.ownerName,
        reason: `Matches ${distinctLeadIds.length} distinct leads`,
        candidateLeadIds: distinctLeadIds,
        phonesAdded: 0,
        emailsAdded: 0,
        dupesIgnored: 0,
      };
      rowResults.push(result);
      if (!dryRun) await persistRow(nr, result, bucket[0]?.id ?? null, null);
      continue;
    }

    // matched or matched_no_lead: pick the representative batchlead row.
    const primaryBatchLead = bucket[0];

    if (status === "matched") {
      matched++;
      const leadId = distinctLeadIds[0];
      let rowPhones = 0;
      let rowEmails = 0;
      let rowDupes = 0;

      if (!dryRun) {
        const phoneSet = await getLeadPhoneSet(leadId);
        const phonesToInsert: Array<{
          lead_id: string;
          phone_number: string;
          phone_type: string | null;
          is_dnc: boolean;
          display_order: number;
        }> = [];
        let order = phoneSet.size;
        for (const ph of nr.phones) {
          const norm = normalizePhone(ph.number);
          if (!norm) continue;
          if (phoneSet.has(norm)) {
            rowDupes++;
            continue;
          }
          phoneSet.add(norm);
          phonesToInsert.push({
            lead_id: leadId,
            phone_number: ph.number,
            phone_type: ph.type,
            is_dnc: ph.dnc,
            display_order: order++,
          });
        }
        if (phonesToInsert.length > 0) {
          await admin.from("lead_phones").insert(phonesToInsert);
          rowPhones += phonesToInsert.length;
        }

        // Emails: fill leads.email if empty, else properties.email/email2.
        const emailSet = await getLeadEmailSet(leadId);
        for (const em of nr.emails) {
          const norm = normalizeEmail(em);
          if (!norm) continue;
          if (emailSet.has(norm)) {
            rowDupes++;
            continue;
          }
          const placed = await placeEmail(leadId, em);
          if (placed) {
            emailSet.add(norm);
            rowEmails++;
          } else {
            rowDupes++;
          }
        }
      } else {
        // Dry-run estimate: count non-duplicate against a fresh fetch.
        const phoneSet = await getLeadPhoneSet(leadId);
        for (const ph of nr.phones) {
          const norm = normalizePhone(ph.number);
          if (!norm) continue;
          if (phoneSet.has(norm)) rowDupes++;
          else {
            phoneSet.add(norm);
            rowPhones++;
          }
        }
        const emailSet = await getLeadEmailSet(leadId);
        for (const em of nr.emails) {
          const norm = normalizeEmail(em);
          if (!norm) continue;
          if (emailSet.has(norm)) rowDupes++;
          else {
            emailSet.add(norm);
            rowEmails++;
          }
        }
      }

      phonesAdded += rowPhones;
      emailsAdded += rowEmails;
      dupesIgnored += rowDupes;
      const result: RowResult = {
        status,
        apn: nr.apnRaw,
        state: nr.stateRaw,
        county: nr.countyRaw,
        owner: nr.ownerName,
        phonesAdded: rowPhones,
        emailsAdded: rowEmails,
        dupesIgnored: rowDupes,
      };
      rowResults.push(result);
      if (!dryRun) await persistRow(nr, result, primaryBatchLead.id, leadId);
      continue;
    }

    // matched_no_lead: enrich the raw batchlead row's empty slots only.
    matchedNoLead++;
    let rowPhones = 0;
    let rowEmails = 0;
    let rowDupes = 0;

    if (!dryRun) {
      const { added: pAdded, dupes: pDupes } = await enrichBatchLeadPhones(
        primaryBatchLead,
        nr,
      );
      const { added: eAdded, dupes: eDupes } = await enrichBatchLeadEmails(
        primaryBatchLead,
        nr,
      );
      rowPhones = pAdded;
      rowEmails = eAdded;
      rowDupes = pDupes + eDupes;
    } else {
      // Dry-run estimate against current empty slots
      const existingPhones = new Set(
        [
          primaryBatchLead.phone_1,
          primaryBatchLead.phone_2,
          primaryBatchLead.phone_3,
          primaryBatchLead.phone_4,
          primaryBatchLead.phone_5,
        ]
          .map((p) => normalizePhone(p))
          .filter((v): v is string => Boolean(v)),
      );
      let freeSlots =
        5 -
        [
          primaryBatchLead.phone_1,
          primaryBatchLead.phone_2,
          primaryBatchLead.phone_3,
          primaryBatchLead.phone_4,
          primaryBatchLead.phone_5,
        ].filter((p) => p && String(p).trim() !== "").length;
      for (const ph of nr.phones) {
        const norm = normalizePhone(ph.number);
        if (!norm) continue;
        if (existingPhones.has(norm)) {
          rowDupes++;
          continue;
        }
        if (freeSlots > 0) {
          existingPhones.add(norm);
          freeSlots--;
          rowPhones++;
        }
      }
    }

    phonesAdded += rowPhones;
    emailsAdded += rowEmails;
    dupesIgnored += rowDupes;
    const result: RowResult = {
      status,
      apn: nr.apnRaw,
      state: nr.stateRaw,
      county: nr.countyRaw,
      owner: nr.ownerName,
      reason: "Matched raw property with no CRM lead (no lead created)",
      phonesAdded: rowPhones,
      emailsAdded: rowEmails,
      dupesIgnored: rowDupes,
    };
    rowResults.push(result);
    if (!dryRun) await persistRow(nr, result, primaryBatchLead.id, null);
  }

  // Finalize import aggregate counts
  if (!dryRun && importId) {
    await admin
      .from("skip_trace_imports")
      .update({
        matched,
        matched_no_lead: matchedNoLead,
        unmatched,
        ambiguous,
        malformed,
        phones_added: phonesAdded,
        emails_added: emailsAdded,
        dupes_ignored: dupesIgnored,
      })
      .eq("id", importId);
  }

  return NextResponse.json({
    success: true,
    dryRun,
    importId,
    total: rows.length,
    matched,
    matched_no_lead: matchedNoLead,
    unmatched,
    ambiguous,
    malformed,
    phones_added: phonesAdded,
    emails_added: emailsAdded,
    dupes_ignored: dupesIgnored,
    unmatchedRows: rowResults.filter((r) => r.status === "unmatched"),
    ambiguousRows: rowResults.filter((r) => r.status === "ambiguous"),
    malformedRows: rowResults.filter((r) => r.status === "malformed"),
  });

  // --- helpers (closures over admin) ---

  async function persistRow(
    nr: NormalizedSkipTraceRow,
    result: RowResult,
    batchLeadId: string | null,
    leadId: string | null,
  ) {
    if (!importId) return;
    await admin!.from("skip_trace_rows").insert({
      import_id: importId,
      raw_row: nr.raw,
      apn_raw: nr.apnRaw,
      state_raw: nr.stateRaw,
      county_raw: nr.countyRaw,
      apn_norm: nr.apnNorm,
      state_norm: nr.stateNorm,
      county_norm: nr.countyNorm,
      match_key: nr.matchKey,
      match_status: result.status,
      matched_batchlead_id: batchLeadId,
      matched_lead_id: leadId,
      candidate_lead_ids: result.candidateLeadIds ?? null,
      phones_added: result.phonesAdded,
      emails_added: result.emailsAdded,
      dupes_ignored: result.dupesIgnored,
      notes: result.reason ?? null,
    });
  }

  // Place a single email into the first available slot for a lead.
  async function placeEmail(leadId: string, email: string): Promise<boolean> {
    const { data: lead } = await admin!
      .from("leads")
      .select("email")
      .eq("id", leadId)
      .single();
    if (lead && (!lead.email || lead.email.trim() === "")) {
      await admin!.from("leads").update({ email }).eq("id", leadId);
      return true;
    }
    const { data: props } = await admin!
      .from("properties")
      .select("id, email, email2")
      .eq("lead_id", leadId);
    for (const pr of props ?? []) {
      if (!pr.email || pr.email.trim() === "") {
        await admin!.from("properties").update({ email }).eq("id", pr.id);
        return true;
      }
      if (!pr.email2 || pr.email2.trim() === "") {
        await admin!.from("properties").update({ email2: email }).eq("id", pr.id);
        return true;
      }
    }
    return false;
  }

  async function enrichBatchLeadPhones(
    bl: BatchLeadRecord,
    nr: NormalizedSkipTraceRow,
  ): Promise<{ added: number; dupes: number }> {
    const slots: Array<keyof BatchLeadRecord> = [
      "phone_1",
      "phone_2",
      "phone_3",
      "phone_4",
      "phone_5",
    ];
    const existing = new Set<string>();
    for (const s of slots) {
      const n = normalizePhone(bl[s] as string | null);
      if (n) existing.add(n);
    }
    const update: Record<string, string> = {};
    let added = 0;
    let dupes = 0;
    for (const ph of nr.phones) {
      const norm = normalizePhone(ph.number);
      if (!norm) continue;
      if (existing.has(norm)) {
        dupes++;
        continue;
      }
      const freeSlot = slots.find(
        (s) =>
          !(bl[s] && String(bl[s]).trim() !== "") &&
          update[s as string] === undefined,
      );
      if (!freeSlot) continue; // no room
      update[freeSlot as string] = ph.number;
      existing.add(norm);
      added++;
    }
    if (added > 0) {
      await admin!.from("batchleads").update(update).eq("id", bl.id);
    }
    return { added, dupes };
  }

  async function enrichBatchLeadEmails(
    bl: BatchLeadRecord,
    nr: NormalizedSkipTraceRow,
  ): Promise<{ added: number; dupes: number }> {
    const existing = new Set<string>();
    const e1 = normalizeEmail(bl.email);
    const e2 = normalizeEmail(bl.email_2);
    if (e1) existing.add(e1);
    if (e2) existing.add(e2);
    const update: Record<string, string> = {};
    let added = 0;
    let dupes = 0;
    for (const em of nr.emails) {
      const norm = normalizeEmail(em);
      if (!norm) continue;
      if (existing.has(norm)) {
        dupes++;
        continue;
      }
      if (!(bl.email && bl.email.trim() !== "") && update.email === undefined) {
        update.email = em;
      } else if (
        !(bl.email_2 && bl.email_2.trim() !== "") &&
        update.email_2 === undefined
      ) {
        update.email_2 = em;
      } else {
        continue; // no room
      }
      existing.add(norm);
      added++;
    }
    if (added > 0) {
      await admin!.from("batchleads").update(update).eq("id", bl.id);
    }
    return { added, dupes };
  }
}
