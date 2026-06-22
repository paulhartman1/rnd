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
  listedWithAgent: string;
  propertyType: string;
  ownsLand?: string;
  repairsNeeded?: string;
  closeTimeline: string;
  sellReason: string;
  acceptableOffer: string;
  negotiability?: string;
  streetAddress: string;
  address?: string;
  city: string;
  state: string;
  postalCode: string;
  fullName: string;
  email: string;
  phone: string;
  smsConsent: boolean;
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

function requiredTrimmedString(value: unknown, fieldLabel: string): ParseResult<string> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `${fieldLabel} is required.` };
  }

  return { ok: true, data: value.trim() };
}
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

function yesNoToBoolean(value: unknown, fieldLabel: string): ParseResult<boolean> {
  if (value === "Yes") {
    return { ok: true, data: true };
  }
  if (value === "No") {
    return { ok: true, data: false };
  }

  return { ok: false, error: `${fieldLabel} must be Yes or No.` };
}

export function parseLeadPayload(payload: unknown): ParseResult<LeadInsert> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = payload as Partial<IntakeAnswers> & Record<string, unknown>;
  const listedWithAgent = yesNoToBoolean(body.listedWithAgent, "listedWithAgent");
  if (!listedWithAgent.ok) return listedWithAgent;

  const propertyType = requiredTrimmedString(body.propertyType, "propertyType");
  if (!propertyType.ok) return propertyType;

  // ownsLand is optional - only validate if provided
  let ownsLandValue: boolean | null = null;
  if (body.ownsLand !== undefined && body.ownsLand !== null) {
    const ownsLand = yesNoToBoolean(body.ownsLand, "ownsLand");
    if (!ownsLand.ok) return ownsLand;
    ownsLandValue = ownsLand.data;
  }

  // repairsNeeded is optional - only validate if provided
  let repairsNeededValue: string | null = null;
  if (body.repairsNeeded !== undefined && body.repairsNeeded !== null && body.repairsNeeded.trim() !== "") {
    const repairsNeeded = requiredTrimmedString(body.repairsNeeded, "repairsNeeded");
    if (!repairsNeeded.ok) return repairsNeeded;
    repairsNeededValue = repairsNeeded.data;
  }

  const closeTimeline = requiredTrimmedString(body.closeTimeline, "closeTimeline");
  if (!closeTimeline.ok) return closeTimeline;

  const sellReason = requiredTrimmedString(body.sellReason, "sellReason");
  if (!sellReason.ok) return sellReason;

  const acceptableOfferValue = firstOptionalTrimmedString(
    body.acceptableOffer,
    body.negotiability,
    body.Negotiability,
  );
  if (!acceptableOfferValue) {
    return { ok: false, error: "acceptableOffer or negotiability is required." };
  }

  const combinedAddress = firstOptionalTrimmedString(body.address, body.Address);
  const streetAddressValue = firstOptionalTrimmedString(body.streetAddress, combinedAddress);
  if (!streetAddressValue) {
    return { ok: false, error: "streetAddress or address is required." };
  }

  let cityValue: string | null = null;
  let stateValue: string | null = null;
  let postalCodeValue: string | null = null;

  if (combinedAddress) {
    cityValue = optionalTrimmedString(body.city);
    stateValue = optionalTrimmedString(body.state);
    postalCodeValue = optionalTrimmedString(body.postalCode);
  } else {
    const city = requiredTrimmedString(body.city, "city");
    if (!city.ok) return city;

    const state = requiredTrimmedString(body.state, "state");
    if (!state.ok) return state;

    const postalCode = requiredTrimmedString(body.postalCode, "postalCode");
    if (!postalCode.ok) return postalCode;

    cityValue = city.data;
    stateValue = state.data;
    postalCodeValue = postalCode.data;
  }

  const fullName = requiredTrimmedString(body.fullName, "fullName");
  if (!fullName.ok) return fullName;

  const emailValue = optionalTrimmedString(body.email);
  if (emailValue && !/\S+@\S+\.\S+/.test(emailValue)) {
    return { ok: false, error: "A valid email is required." };
  }

  const phone = requiredTrimmedString(body.phone, "phone");
  if (!phone.ok) return phone;

  if (body.smsConsent !== true) {
    return { ok: false, error: "SMS consent is required." };
  }

  return {
    ok: true,
    data: {
      listed_with_agent: listedWithAgent.data,
      property_type: propertyType.data,
      owns_land: ownsLandValue,
      repairs_needed: repairsNeededValue,
      close_timeline: closeTimeline.data,
      sell_reason: sellReason.data,
      acceptable_offer: acceptableOfferValue,
      street_address: streetAddressValue,
      city: cityValue,
      state: stateValue,
      postal_code: postalCodeValue,
      full_name: fullName.data,
      email: emailValue,
      phone: phone.data,
      sms_consent: true,
      owner_notes: firstOptionalTrimmedString(body.notes, body.Notes),
    },
  };
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && leadStatuses.includes(value as LeadStatus);
}
