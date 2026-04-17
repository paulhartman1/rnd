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
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch appointment types" },
      { status: 500 },
    );
  }

  return NextResponse.json({ appointmentTypes: data as AppointmentTypeRow[] });
}

export async function POST(request: Request) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { name, description, defaultDurationMinutes, displayOrder } = body;

  if (!name || !defaultDurationMinutes) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("appointment_types")
    .insert({
      name,
      description: description || null,
      default_duration_minutes: defaultDurationMinutes,
      display_order: displayOrder ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create appointment type" },
      { status: 500 },
    );
  }

  return NextResponse.json({ appointmentType: data });
}
