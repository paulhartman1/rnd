import { describe, it, expect } from "vitest";
import {
  parseSkipTraceCSV,
  normalizeState,
  normalizeCounty,
  normalizeApn,
  normalizePhone,
  normalizeEmail,
  buildMatchKey,
  batchLeadMatchKey,
  normalizeSkipTraceRow,
  resolveMatchStatus,
  extractPhones,
  extractEmails,
  extractApn,
  extractState,
  extractCounty,
} from "./skip-trace";

describe("normalizeState", () => {
  it("trims and uppercases", () => {
    expect(normalizeState(" co ")).toBe("CO");
    expect(normalizeState("co")).toBe("CO");
  });
  it("returns null for empty/nullish", () => {
    expect(normalizeState("")).toBeNull();
    expect(normalizeState(null)).toBeNull();
    expect(normalizeState(undefined)).toBeNull();
  });
});

describe("normalizeCounty", () => {
  it("lowercases and trims", () => {
    expect(normalizeCounty(" Jefferson ")).toBe("jefferson");
  });
  it("strips a trailing County suffix regardless of case", () => {
    expect(normalizeCounty("El Paso County")).toBe("el paso");
    expect(normalizeCounty("DENVER COUNTY")).toBe("denver");
    expect(normalizeCounty("Boulder county")).toBe("boulder");
  });
  it("does not strip 'county' embedded elsewhere", () => {
    // "County Line" should remain intact (suffix only)
    expect(normalizeCounty("County Line")).toBe("county line");
  });
  it("returns null for empty", () => {
    expect(normalizeCounty("")).toBeNull();
    expect(normalizeCounty(null)).toBeNull();
  });
});

describe("normalizeApn", () => {
  it("removes separators and uppercases", () => {
    expect(normalizeApn("29-354-07-024")).toBe("2935407024");
    expect(normalizeApn("05291-17-009-000")).toBe("0529117009000");
    expect(normalizeApn("r0048513")).toBe("R0048513");
  });
  it("treats spaced and dashed variants as equal", () => {
    expect(normalizeApn("74232 02 027")).toBe(normalizeApn("74232-02-027"));
  });
  it("keeps pure numeric APNs intact", () => {
    expect(normalizeApn("430434007")).toBe("430434007");
  });
  it("does NOT collide genuinely different APNs", () => {
    expect(normalizeApn("123-456")).not.toBe(normalizeApn("123-457"));
  });
  it("returns null for empty", () => {
    expect(normalizeApn("")).toBeNull();
    expect(normalizeApn(null)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("strips formatting to digits", () => {
    expect(normalizePhone("(720) 684-8593")).toBe("7206848593");
  });
  it("removes leading US country code when 11 digits", () => {
    expect(normalizePhone("+17206848593")).toBe("7206848593");
    expect(normalizePhone("17206848593")).toBe("7206848593");
  });
  it("returns null for empty", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail(" Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});

describe("buildMatchKey", () => {
  it("joins components", () => {
    expect(buildMatchKey("CO", "jefferson", "2935407024")).toBe(
      "CO|jefferson|2935407024",
    );
  });
  it("returns null if any component missing", () => {
    expect(buildMatchKey(null, "jefferson", "123")).toBeNull();
    expect(buildMatchKey("CO", null, "123")).toBeNull();
    expect(buildMatchKey("CO", "jefferson", null)).toBeNull();
  });
});

describe("batchLeadMatchKey", () => {
  it("normalizes a raw batchleads-style record", () => {
    expect(
      batchLeadMatchKey({
        property_state: "co",
        property_county: "El Paso County",
        apn: "74232-02-027",
      }),
    ).toBe("CO|el paso|7423202027");
  });

  it("exact match: skip-trace row and property produce the same key", () => {
    const rowKey = buildMatchKey(
      normalizeState("CO"),
      normalizeCounty("Jefferson"),
      normalizeApn("29-354-07-024"),
    );
    const propKey = batchLeadMatchKey({
      property_state: "CO",
      property_county: "Jefferson",
      apn: "2935407024",
    });
    expect(rowKey).toBe(propKey);
  });

  it("County suffix difference still matches", () => {
    const a = batchLeadMatchKey({
      property_state: "CO",
      property_county: "El Paso County",
      apn: "74232-02-027",
    });
    const b = batchLeadMatchKey({
      property_state: "CO",
      property_county: "El Paso",
      apn: "74232 02 027",
    });
    expect(a).toBe(b);
  });
});

describe("extractors are resilient to header variants", () => {
  it("reads APN/State/County across header spellings", () => {
    expect(extractApn({ Apn: "123" })).toBe("123");
    expect(extractApn({ APN: "123" })).toBe("123");
    expect(extractState({ "Property State": "CO" })).toBe("CO");
    expect(extractState({ State: "CO" })).toBe("CO");
    expect(extractCounty({ "Property County": "Denver" })).toBe("Denver");
  });

  it("extracts up to 5 phones with type and dnc", () => {
    const phones = extractPhones({
      "Phone 1": "7201112222",
      "Phone 1 TYPE": "mobile",
      "Phone 1 DNC": "true",
      "Phone 2": "7203334444",
    });
    expect(phones).toHaveLength(2);
    expect(phones[0]).toEqual({
      number: "7201112222",
      type: "mobile",
      dnc: true,
    });
    expect(phones[1].dnc).toBe(false);
  });

  it("extracts both emails", () => {
    expect(
      extractEmails({ Email: "a@b.com", "Email 2": "c@d.com" }),
    ).toEqual(["a@b.com", "c@d.com"]);
  });
});

describe("normalizeSkipTraceRow", () => {
  it("marks malformed when APN missing", () => {
    const nr = normalizeSkipTraceRow({
      "Property State": "CO",
      "Property County": "Denver",
    });
    expect(nr.malformed).toBe(true);
    expect(nr.malformedReason).toContain("APN");
    expect(nr.matchKey).toBeNull();
  });

  it("marks malformed when state/county missing", () => {
    const nr = normalizeSkipTraceRow({ APN: "123" });
    expect(nr.malformed).toBe(true);
    expect(nr.malformedReason).toContain("state");
    expect(nr.malformedReason).toContain("county");
  });

  it("builds a match key for a well-formed row WITHOUT an address", () => {
    // Skip-trace rows need not carry a property address.
    const nr = normalizeSkipTraceRow({
      APN: "29-354-07-024",
      "Property State": "CO",
      "Property County": "Jefferson",
      "Phone 1": "7206848593",
    });
    expect(nr.malformed).toBe(false);
    expect(nr.matchKey).toBe("CO|jefferson|2935407024");
    expect(nr.raw).toBeDefined(); // provenance preserved
  });

  it("preserves the raw row for provenance", () => {
    const raw = { APN: "1", "Property State": "CO", "Property County": "X", extra: "keep" };
    const nr = normalizeSkipTraceRow(raw);
    expect(nr.raw).toEqual(raw);
  });
});

describe("resolveMatchStatus (ambiguity at resolved-target level)", () => {
  it("unmatched when no batchleads matched", () => {
    expect(resolveMatchStatus(0, [])).toBe("unmatched");
  });
  it("matched when exactly one distinct lead", () => {
    expect(resolveMatchStatus(3, ["lead-a"])).toBe("matched");
  });
  it("matched_no_lead when batchleads exist but no lead", () => {
    expect(resolveMatchStatus(2, [])).toBe("matched_no_lead");
  });
  it("ambiguous only when more than one distinct lead", () => {
    expect(resolveMatchStatus(2, ["lead-a", "lead-b"])).toBe("ambiguous");
  });
  it("duplicate raw rows resolving to one lead are NOT ambiguous", () => {
    // 5 raw batchleads rows (re-imports) -> single lead
    expect(resolveMatchStatus(5, ["lead-a"])).toBe("matched");
  });
});

describe("parseSkipTraceCSV", () => {
  it("parses headers and rows", () => {
    const csv = "APN,Property State,Property County\n123,CO,Denver\n456,CO,Boulder";
    const rows = parseSkipTraceCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      APN: "123",
      "Property State": "CO",
      "Property County": "Denver",
    });
  });
  it("handles tab-delimited", () => {
    const tsv = "APN\tProperty State\n123\tCO";
    const rows = parseSkipTraceCSV(tsv);
    expect(rows[0]).toEqual({ APN: "123", "Property State": "CO" });
  });
  it("returns empty for header-only", () => {
    expect(parseSkipTraceCSV("APN,State")).toEqual([]);
  });
});
