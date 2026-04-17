export type AppointmentTypeRow = {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type AvailabilityWindowRow = {
  id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BlackoutPeriodRow = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};

export const appointmentRequestStatuses = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type AppointmentRequestStatus =
  (typeof appointmentRequestStatuses)[number];

export type AppointmentRequestRow = {
  id: string;
  appointment_type_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  requested_start_time: string;
  requested_end_time: string;
  notes: string | null;
  status: AppointmentRequestStatus;
  approved_appointment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentRequestWithType = AppointmentRequestRow & {
  appointment_type?: AppointmentTypeRow | null;
};

export type TimeSlot = {
  start_time: string;
  end_time: string;
  available: boolean;
};

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};
