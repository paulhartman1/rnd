import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentRequestWithType } from "@/lib/appointment-types";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("appointment_requests")
    .select(
      `
      *,
      appointment_type:appointment_types!appointment_type_id (
        id,
        name,
        description,
        default_duration_minutes
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch appointment requests" },
      { status: 500 },
    );
  }

  const requests = (data ?? []).map((req) => ({
    ...req,
    appointment_type:
      Array.isArray(req.appointment_type) && req.appointment_type.length > 0
        ? req.appointment_type[0]
        : req.appointment_type || null,
  })) as AppointmentRequestWithType[];

  return NextResponse.json({ appointmentRequests: requests });
}
