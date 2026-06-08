export type PhoneValidationStatus =
  | "unknown"
  | "valid"
  | "invalid"
  | "disconnected"
  | "wrong_number";

export type LeadPhone = {
  id: string;
  lead_id: string;
  phone_number: string;
  phone_type: string | null;
  is_primary: boolean;
  is_dnc: boolean;
  validation_status: PhoneValidationStatus;
  validation_notes: string | null;
  last_called_at: string | null;
  call_attempts: number;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export const validationStatusLabels: Record<PhoneValidationStatus, string> = {
  unknown: "Unknown",
  valid: "Valid",
  invalid: "Invalid",
  disconnected: "Disconnected",
  wrong_number: "Wrong Number",
};

export const validationStatusColors: Record<
  PhoneValidationStatus,
  { bg: string; text: string; border: string }
> = {
  unknown: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
  },
  valid: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  invalid: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  },
  disconnected: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  },
  wrong_number: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
};
