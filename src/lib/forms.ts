export const formTypes = ["purchase_agreement"] as const;
export type FormType = (typeof formTypes)[number];

export const formStatuses = ["draft", "pending_signature", "signed", "cancelled"] as const;
export type FormStatus = (typeof formStatuses)[number];

export interface PurchaseAgreementData {
  seller_name: string;
  seller_role?: string;
  property_address: string;
  property_apn: string | null;
  earnest_money: number;
  purchase_price: number;
  buyer_name: string;
  date_created: string;
  seller_signature_name?: string;
  buyer_signature_name?: string;
}

export interface FormRow {
  id: string;
  form_type: FormType;
  lead_id: string;
  property_id: string | null;
  form_data: Record<string, unknown>;
  status: FormStatus;
  docusign_envelope_id: string | null;
  docusign_status: string | null;
  signed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormInsert {
  form_type: FormType;
  lead_id: string;
  property_id?: string | null;
  form_data: Record<string, unknown>;
  status?: FormStatus;
  created_by: string;
}

export interface FormUpdate {
  form_data?: Record<string, unknown>;
  status?: FormStatus;
  docusign_envelope_id?: string | null;
  docusign_status?: string | null;
  signed_at?: string | null;
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

export function isFormType(value: unknown): value is FormType {
  return typeof value === "string" && formTypes.includes(value as FormType);
}

export function isFormStatus(value: unknown): value is FormStatus {
  return typeof value === "string" && formStatuses.includes(value as FormStatus);
}

export function validateFormInsert(payload: unknown, userId: string): ValidationResult<FormInsert> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = payload as Partial<FormInsert & { property_id?: string | null }>;

  // Validate form_type
  if (!isFormType(body.form_type)) {
    return { ok: false, error: "Invalid form_type." };
  }

  // Validate lead_id
  const leadId = requiredTrimmedString(body.lead_id, "lead_id");
  if (!leadId.ok) return leadId;

  // Validate form_data (must be an object)
  if (body.form_data !== undefined && typeof body.form_data !== "object") {
    return { ok: false, error: "form_data must be an object." };
  }

  // Validate status if provided
  if (body.status !== undefined && !isFormStatus(body.status)) {
    return { ok: false, error: "Invalid status." };
  }

  // Validate property_id if provided
  let propertyId: string | null = null;
  if (body.property_id !== undefined && body.property_id !== null) {
    if (typeof body.property_id !== "string" || body.property_id.trim().length === 0) {
      return { ok: false, error: "property_id must be a valid UUID or null." };
    }
    propertyId = body.property_id.trim();
  }

  return {
    ok: true,
    data: {
      form_type: body.form_type,
      lead_id: leadId.data,
      property_id: propertyId,
      form_data: (body.form_data as Record<string, unknown>) || {},
      status: body.status || "draft",
      created_by: userId,
    },
  };
}

export function validateFormUpdate(payload: unknown): ValidationResult<FormUpdate> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = payload as Partial<FormUpdate>;
  const update: FormUpdate = {};

  // Validate form_data if provided
  if (body.form_data !== undefined) {
    if (typeof body.form_data !== "object") {
      return { ok: false, error: "form_data must be an object." };
    }
    update.form_data = body.form_data as Record<string, unknown>;
  }

  // Validate status if provided
  if (body.status !== undefined) {
    if (!isFormStatus(body.status)) {
      return { ok: false, error: "Invalid status." };
    }
    update.status = body.status;
  }

  // Validate docusign fields if provided
  if (body.docusign_envelope_id !== undefined) {
    update.docusign_envelope_id = body.docusign_envelope_id;
  }

  if (body.docusign_status !== undefined) {
    update.docusign_status = body.docusign_status;
  }

  if (body.signed_at !== undefined) {
    update.signed_at = body.signed_at;
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "No valid fields to update." };
  }

  return { ok: true, data: update };
}

export function getFormTypeName(formType: FormType): string {
  switch (formType) {
    case "purchase_agreement":
      return "Purchase Agreement";
    default:
      return formType;
  }
}

export function getFormStatusName(status: FormStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_signature":
      return "Pending Signature";
    case "signed":
      return "Signed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
