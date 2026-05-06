export interface PropertyRow {
  id: string;
  lead_id: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  apn: string | null;
  property_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyInsert {
  lead_id: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  apn?: string | null;
  property_type?: string | null;
  notes?: string | null;
}

export interface PropertyUpdate {
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  apn?: string | null;
  property_type?: string | null;
  notes?: string | null;
}

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function requiredTrimmedString(value: unknown, fieldLabel: string): ValidationResult<string> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `${fieldLabel} is required.` };
  }
  return { ok: true, data: value.trim() };
}

function optionalTrimmedString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function validatePropertyInsert(payload: unknown): ValidationResult<PropertyInsert> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = payload as Partial<PropertyInsert>;

  const leadId = requiredTrimmedString(body.lead_id, "lead_id");
  if (!leadId.ok) return leadId;

  const streetAddress = requiredTrimmedString(body.street_address, "street_address");
  if (!streetAddress.ok) return streetAddress;

  const city = requiredTrimmedString(body.city, "city");
  if (!city.ok) return city;

  const state = requiredTrimmedString(body.state, "state");
  if (!state.ok) return state;

  const postalCode = requiredTrimmedString(body.postal_code, "postal_code");
  if (!postalCode.ok) return postalCode;

  return {
    ok: true,
    data: {
      lead_id: leadId.data,
      street_address: streetAddress.data,
      city: city.data,
      state: state.data,
      postal_code: postalCode.data,
      apn: optionalTrimmedString(body.apn),
      property_type: optionalTrimmedString(body.property_type),
      notes: optionalTrimmedString(body.notes),
    },
  };
}

export function validatePropertyUpdate(payload: unknown): ValidationResult<PropertyUpdate> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = payload as Partial<PropertyUpdate>;
  const update: PropertyUpdate = {};

  // All fields are optional for updates, but if provided must be valid
  if (body.street_address !== undefined) {
    const streetAddress = requiredTrimmedString(body.street_address, "street_address");
    if (!streetAddress.ok) return streetAddress;
    update.street_address = streetAddress.data;
  }

  if (body.city !== undefined) {
    const city = requiredTrimmedString(body.city, "city");
    if (!city.ok) return city;
    update.city = city.data;
  }

  if (body.state !== undefined) {
    const state = requiredTrimmedString(body.state, "state");
    if (!state.ok) return state;
    update.state = state.data;
  }

  if (body.postal_code !== undefined) {
    const postalCode = requiredTrimmedString(body.postal_code, "postal_code");
    if (!postalCode.ok) return postalCode;
    update.postal_code = postalCode.data;
  }

  if (body.apn !== undefined) {
    update.apn = optionalTrimmedString(body.apn);
  }

  if (body.property_type !== undefined) {
    update.property_type = optionalTrimmedString(body.property_type);
  }

  if (body.notes !== undefined) {
    update.notes = optionalTrimmedString(body.notes);
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "No valid fields to update." };
  }

  return { ok: true, data: update };
}

export function formatPropertyAddress(property: PropertyRow): string {
  return `${property.street_address}, ${property.city}, ${property.state} ${property.postal_code}`;
}
