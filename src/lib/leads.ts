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

  const emailValue = firstOptionalTrimmedString(body.email, body.Email);
  if (emailValue && !/\S+@\S+\.\S+/.test(emailValue)) {
    return { ok: false, error: "A valid email is required." };
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
      street_address: firstOptionalTrimmedString(body.streetAddress, body.StreetAddress, body["Street Address"], body.address, body.Address),
      city: firstOptionalTrimmedString(body.city, body.City),
      state: firstOptionalTrimmedString(body.state, body.State),
      postal_code: firstOptionalTrimmedString(
        body.postalCode,
        body.PostalCode,
        body["Postal Code"],
        body.zipCode,
        body.ZipCode,
        body.zip,
        body.Zip,
        body["Zip Code"],
      ),
      full_name: firstOptionalTrimmedString(body.fullName, body.FullName, body["Full Name"], body.name, body.Name),
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
