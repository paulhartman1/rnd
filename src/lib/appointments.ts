export const appointmentStatuses = [
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];

export type AppointmentRow = {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentWithLead = AppointmentRow & {
  lead?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    street_address: string;
  } | null;
};
