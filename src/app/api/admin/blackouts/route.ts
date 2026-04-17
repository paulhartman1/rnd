import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BlackoutPeriodRow } from "@/lib/appointment-types";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("blackout_periods")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch blackout periods" },
      { status: 500 },
    );
  }

  return NextResponse.json({ blackoutPeriods: data as BlackoutPeriodRow[] });
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
  const { title, startTime, endTime } = body;

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("blackout_periods")
    .insert({
      title,
      start_time: startTime,
      end_time: endTime,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create blackout period" },
      { status: 500 },
    );
  }

  return NextResponse.json({ blackoutPeriod: data });
}
