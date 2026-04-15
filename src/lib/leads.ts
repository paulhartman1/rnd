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
  repairsNeeded: string;
  closeTimeline: string;
  sellReason: string;
  acceptableOffer: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  fullName: string;
  email: string;
  phone: string;
  smsConsent: boolean;
};

export type LeadInsert = {
  listed_with_agent: boolean;
  property_type: string;
  owns_land: boolean | null;
  repairs_needed: string;
  close_timeline: string;
  sell_reason: string;
  acceptable_offer: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  full_name: string;
  email: string;
  phone: string;
  sms_consent: boolean;
};

export type LeadRow = LeadInsert & {
  id: string;
  status: LeadStatus;
  owner_notes: string | null;
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

  const body = payload as Partial<IntakeAnswers>;
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

  const repairsNeeded = requiredTrimmedString(body.repairsNeeded, "repairsNeeded");
  if (!repairsNeeded.ok) return repairsNeeded;

  const closeTimeline = requiredTrimmedString(body.closeTimeline, "closeTimeline");
  if (!closeTimeline.ok) return closeTimeline;

  const sellReason = requiredTrimmedString(body.sellReason, "sellReason");
  if (!sellReason.ok) return sellReason;

  const acceptableOffer = requiredTrimmedString(body.acceptableOffer, "acceptableOffer");
  if (!acceptableOffer.ok) return acceptableOffer;

  const streetAddress = requiredTrimmedString(body.streetAddress, "streetAddress");
  if (!streetAddress.ok) return streetAddress;

  const city = requiredTrimmedString(body.city, "city");
  if (!city.ok) return city;

  const state = requiredTrimmedString(body.state, "state");
  if (!state.ok) return state;

  const postalCode = requiredTrimmedString(body.postalCode, "postalCode");
  if (!postalCode.ok) return postalCode;

  const fullName = requiredTrimmedString(body.fullName, "fullName");
  if (!fullName.ok) return fullName;

  const email = requiredTrimmedString(body.email, "email");
  if (!email.ok || !/\S+@\S+\.\S+/.test(email.data)) {
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
      repairs_needed: repairsNeeded.data,
      close_timeline: closeTimeline.data,
      sell_reason: sellReason.data,
      acceptable_offer: acceptableOffer.data,
      street_address: streetAddress.data,
      city: city.data,
      state: state.data,
      postal_code: postalCode.data,
      full_name: fullName.data,
      email: email.data,
      phone: phone.data,
      sms_consent: true,
    },
  };
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && leadStatuses.includes(value as LeadStatus);
}
