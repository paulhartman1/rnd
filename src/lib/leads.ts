/**
 * Parse a single address string into components, working backward from zip
 * Handles formats like:
 * - "123 Main St, Denver, CO 80202"
 * - "456 Oak Avenue, Boulder, CO, 80301"
 * - "789 Pine Street Denver CO 80202"
 * - "123 Main St Denver CO 80202-1234"
 */
export function parseAddress(address: string): {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  // Remove extra whitespace, commas, and normalize
  let remaining = address.trim().replace(/\s+/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ');
  
  // Extract ZIP from the end: last 5 digits, or 5-4 format
  let zip: string | null = null;
  
  // Check for 5-digit zip at the end
  const fiveDigitMatch = remaining.match(/(\d{5})\s*$/);
  if (fiveDigitMatch) {
    zip = fiveDigitMatch[1];
    remaining = remaining.substring(0, remaining.length - fiveDigitMatch[0].length).trim();
    
    // Check if there's a -4 digit extension before the 5 digits
    const extMatch = remaining.match(/-?(\d{4})\s*$/);
    if (extMatch) {
      zip = `${extMatch[1]}-${zip}`;
      remaining = remaining.substring(0, remaining.length - extMatch[0].length).trim();
    }
  } else {
    // Check for xxxxx-xxxx format
    const extendedMatch = remaining.match(/(\d{5}-\d{4})\s*$/);
    if (extendedMatch) {
      zip = extendedMatch[1];
      remaining = remaining.substring(0, remaining.length - extendedMatch[0].length).trim();
    }
  }
  
  // Extract state from the end: 2 uppercase letters
  let state: string | null = null;
  const stateMatch = remaining.match(/\b([A-Z]{2})\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    remaining = remaining.substring(0, remaining.length - stateMatch[0].length).trim();
  }
  
  // Extract city from the end: everything up to the last space (one word)
  let city: string | null = null;
  const lastSpaceIndex = remaining.lastIndexOf(' ');
  if (lastSpaceIndex !== -1) {
    city = remaining.substring(lastSpaceIndex + 1).trim();
    remaining = remaining.substring(0, lastSpaceIndex).trim();
  }
  
  // Everything remaining is the street address
  const street = remaining || null;
  
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

  const emailValue = firstOptionalTrimmedString(body.email, body.Email);
  if (emailValue && !/\S+@\S+\.\S+/.test(emailValue)) {
    return { ok: false, error: "Invalid email format." };
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
      ...(() => {
        // Handle address: prefer individual fields, fall back to parsing single address field
        let streetAddress = firstOptionalTrimmedString(body.streetAddress, body.StreetAddress, body["Street Address"]);
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
        
        // If no individual fields but we have a single address, parse it
        if (!streetAddress && !city && !state && !postalCode) {
          const singleAddress = firstOptionalTrimmedString(body.address, body.Address);
          if (singleAddress) {
            const parsed = parseAddress(singleAddress);
            streetAddress = parsed.street;
            city = parsed.city;
            state = parsed.state;
            postalCode = parsed.zip;
          }
        }
        
        return {
          street_address: streetAddress,
          city,
          state,
          postal_code: postalCode,
        };
      })(),
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
