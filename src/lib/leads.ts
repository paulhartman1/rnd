import * as validation from "./validation";

export function parseAddress(address: string): {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  // Remove extra whitespace, commas, and normalize
  let remaining = address.trim();

  // Extract ZIP from the end: last 5 digits, or 5-4 format
  let zip: string | null = null;

  // Check for xxxxx-xxxx format first
  const extendedMatch = remaining.match(/(\d{5}-\d{4})\s*$/);
  if (extendedMatch) {
    zip = extendedMatch[1];
    remaining = remaining.substring(0, remaining.length - extendedMatch[0].length).trim();
  } else {
    // Check for 5-digit zip at the end
    const fiveDigitMatch = remaining.match(/(\d{5})\s*$/);
    if (fiveDigitMatch) {
      zip = fiveDigitMatch[1];
      remaining = remaining.substring(0, remaining.length - fiveDigitMatch[0].length).trim();
    }
  }

  // rely on comma placement to split the remaining string into parts
  const parts = remaining.split(',').map(part => part.trim()).filter(part => part.length > 0);

  let state: string | null = null;
  let city: string | null = null;
  let street: string | null = null;

  if (parts.length >= 2) {
    // Assume last part is state, second last is city, rest is street
    state = parts[parts.length - 1];
    city = parts[parts.length - 2];
    street = parts.slice(0, parts.length - 2).join(', ');
  } else if (parts.length === 1) {
    // If only one part remains, treat it as street
    street = parts[0];
  }

  return { street, city, state, zip };
}

export const leadStatuses = [
  "new",
  "contacted",
  "offer-sent",
  "under-contract",
  "closed",
  "archived",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export type IntakeAnswers = {
  listedWithAgent?: string;
  propertyType?: string;
  ownsLand?: string;
  repairsNeeded?: string;
  closeTimeline?: string;
  sellReason?: string;
  acceptableOffer?: string;
  negotiability?: string;
  streetAddress?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  smsConsent?: boolean;
  notes?: string;
};

export type LeadInsert = {
  listed_with_agent: boolean | null;
  property_type: string | null;
  owns_land: boolean | null;
  repairs_needed: string | null;
  close_timeline: string | null;
  sell_reason: string | null;
  acceptable_offer: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  sms_consent: boolean;
  owner_notes?: string | null;
};

export type LeadRow = LeadInsert & {
  id: string;
  status: LeadStatus;
  owner_notes: string | null;
  source_id: string;
  source_name?: string;
  isHotLead?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function optionalTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function firstOptionalTrimmedString(...values: unknown[]): string | null {
  for (const value of values) {
    const trimmed = optionalTrimmedString(value);
    if (trimmed) return trimmed;
  }

  return null;
}

function optionalYesNoToBoolean(value: unknown, fieldLabel: string): ParseResult<boolean | null> {
  const trimmed = optionalTrimmedString(value);
  if (!trimmed) return { ok: true, data: null };

  if (trimmed === "Yes") {
    return { ok: true, data: true };
  }
  if (trimmed === "No") {
    return { ok: true, data: false };
  }

  return { ok: false, error: `${fieldLabel} must be Yes or No.` };
}

export function parseLeadPayload(payload: unknown): ParseResult<LeadInsert> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = payload as Partial<IntakeAnswers> & Record<string, unknown>;

  const listedWithAgent = optionalYesNoToBoolean(body.listedWithAgent, "listedWithAgent");
  if (!listedWithAgent.ok) return listedWithAgent;

  const ownsLand = optionalYesNoToBoolean(body.ownsLand, "ownsLand");
  if (!ownsLand.ok) return ownsLand;

  if(!body.address && (!body.streetAddress || body.streetAddress?.trim() === "")) {
    return { ok: false, error: "Invalid address format." };
  }

  if(body.streetAddress && !body.city) {
    body.address = body.streetAddress;
    body.streetAddress = undefined;
  }


  const email = firstOptionalTrimmedString(body.email, body.Email);
  const emailValue = validation.isValidEmail(email ?? "") ? email : null;
  let streetAddress = firstOptionalTrimmedString(body.streetAddress, body.StreetAddress, body["Street Address"]);
  const address = firstOptionalTrimmedString(body.address, body.Address);
  let city = firstOptionalTrimmedString(body.city, body.City);
  let state = firstOptionalTrimmedString(body.state, body.State);
  let postalCode = firstOptionalTrimmedString(
    body.postalCode,
    body.PostalCode,
    body["Postal Code"],
    body.zipCode,
    body.ZipCode,
    body.zip,
    body.Zip,
    body["Zip Code"],
  );

  if (address && (city || state || postalCode)) {
    return { ok: false, error: "If 'address' is provided, 'city', 'state', and 'postalCode' should not be provided." };
  }

  if (address) {
    console.log("Parsing address:", address);
    const parsed = parseAddress(address);
    if (!parsed.street || !parsed.city || !parsed.state || !parsed.zip) {
      return { ok: false, error: "Invalid address format." };
    }
    if (!streetAddress && !address) {
      return { ok: false, error: "streetAddress or address is required." };
    }
    streetAddress = parsed.street;
    city = parsed.city;
    state = parsed.state;
    postalCode = parsed.zip;
  }

  const fullName = firstOptionalTrimmedString(body.fullName, body.FullName, body["Full Name"], body.name, body.Name);
  if(!fullName) {
    return { ok: false, error: "fullName is required." };
  }

  return {
    ok: true,
    data: {
      listed_with_agent: listedWithAgent.data,
      property_type: firstOptionalTrimmedString(body.propertyType, body.PropertyType, body["Property Type"]),
      owns_land: ownsLand.data,
      repairs_needed: firstOptionalTrimmedString(body.repairsNeeded, body.RepairsNeeded, body["Repairs Needed"]),
      close_timeline: firstOptionalTrimmedString(body.closeTimeline, body.CloseTimeline, body["Close Timeline"]),
      sell_reason: firstOptionalTrimmedString(body.sellReason, body.SellReason, body["Sell Reason"]),
      acceptable_offer: firstOptionalTrimmedString(
        body.acceptableOffer,
        body.AcceptableOffer,
        body["Acceptable Offer"],
        body.negotiability,
        body.Negotiability,
      ),
      street_address: streetAddress,
      city,
      state,
      postal_code: postalCode,
      full_name: fullName,
      email: emailValue,
      phone: firstOptionalTrimmedString(body.phone, body.Phone),
      sms_consent: body.smsConsent === true,
      owner_notes: firstOptionalTrimmedString(body.notes, body.Notes),
    },
  };
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && leadStatuses.includes(value as LeadStatus);
}
