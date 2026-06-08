export const formTypes = [
  "purchase_agreement",
] as const;

export type FormType = (typeof formTypes)[number];

export const formStatuses = [
  "draft",
  "pending_signature",
  "signed",
  "cancelled",
] as const;

export type FormStatus = (typeof formStatuses)[number];

export type FormData = {
  seller_name?: string;
  property_address?: string;
  property_apn?: string;
  earnest_money?: string | null;
  purchase_price: string;
  buyer_name?: string;
  created_date?: string;
  [key: string]: unknown;
};

export type FormRow = {
  id: string;
  lead_id: string;
  property_id: string | null;
  form_type: FormType;
  form_data: FormData;
  status: FormStatus;
  docusign_envelope_id: string | null;
  created_at: string;
  updated_at: string;
};

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

export function isFormStatus(value: unknown): value is FormStatus {
  return typeof value === "string" && formStatuses.includes(value as FormStatus);
}
