import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{
    windowId: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { windowId } = await params;
  const body = await request.json();
  const { day_of_week, start_time, end_time, is_active } = body;

  const updateData: Record<string, number | string | boolean> = {};

  if (day_of_week !== undefined) updateData.day_of_week = day_of_week;
  if (start_time !== undefined) updateData.start_time = start_time;
  if (end_time !== undefined) updateData.end_time = end_time;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data, error } = await supabase
    .from("availability_windows")
    .update(updateData)
    .eq("id", windowId)
    .select()
    .single();

  if (error) {
    console.error("Supabase error updating availability:", error);
    return NextResponse.json(
      { error: "Failed to update availability window", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { windowId } = await params;

  const { error } = await supabase
    .from("availability_windows")
    .delete()
    .eq("id", windowId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete availability window" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
