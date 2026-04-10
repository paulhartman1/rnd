import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentWithLead } from "@/lib/appointments";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      lead_id,
      title,
      description,
      start_time,
      end_time,
      status,
      location,
      created_at,
      updated_at,
      lead:leads!lead_id (
        id,
        full_name,
        email,
        phone,
        street_address
      )
    `,
    )
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }

  const appointments = (data ?? []).map((apt) => ({
    ...apt,
    lead: Array.isArray(apt.lead) && apt.lead.length > 0 ? apt.lead[0] : apt.lead || null,
  })) as AppointmentWithLead[];
  return NextResponse.json({ appointments });
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
  const { leadId, title, description, startTime, endTime, status, location } =
    body;

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      lead_id: leadId || null,
      title,
      description: description || null,
      start_time: startTime,
      end_time: endTime,
      status: status || "scheduled",
      location: location || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 },
    );
  }

  return NextResponse.json({ appointment: data });
}
