import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("phone_availability")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch phone availability" }, { status: 500 });
  }

  return NextResponse.json({ phoneAvailability: data });
}

export async function POST(request: Request) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const body = await request.json();
  const { day_of_week, start_time, end_time, is_active } = body;

  if (day_of_week === undefined || !start_time || !end_time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("phone_availability")
    .insert({
      day_of_week,
      start_time,
      end_time,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error creating phone availability:", error);
    return NextResponse.json(
      { error: "Failed to create phone availability", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
