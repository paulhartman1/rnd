import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AvailabilityWindowRow } from "@/lib/appointment-types";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("availability_windows")
    .select("*")
    .order("day_of_week", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch availability windows" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    availabilityWindows: data as AvailabilityWindowRow[],
  });
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
  const { dayOfWeek, startTime, endTime, isActive } = body;

  if (
    dayOfWeek === undefined ||
    !startTime ||
    !endTime ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    return NextResponse.json(
      { error: "Missing or invalid required fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("availability_windows")
    .insert({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_active: isActive ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create availability window" },
      { status: 500 },
    );
  }

  return NextResponse.json({ availabilityWindow: data });
}
