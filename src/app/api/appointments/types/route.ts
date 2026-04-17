import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentTypeRow } from "@/lib/appointment-types";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("appointment_types")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch appointment types" },
      { status: 500 },
    );
  }

  return NextResponse.json({ appointmentTypes: data as AppointmentTypeRow[] });
}
