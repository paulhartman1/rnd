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
  const { reason, start_time, end_time } = body;

  if (!start_time || !end_time) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("blackout_periods")
    .insert({
      reason: reason || null,
      start_time,
      end_time,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error creating blackout:", error);
    return NextResponse.json(
      { error: "Failed to create blackout period", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
