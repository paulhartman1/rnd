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
  const { dayOfWeek, startTime, endTime, isActive } = body;

  const updateData: Record<string, number | string | boolean> = {};

  if (dayOfWeek !== undefined) updateData.day_of_week = dayOfWeek;
  if (startTime !== undefined) updateData.start_time = startTime;
  if (endTime !== undefined) updateData.end_time = endTime;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { error } = await supabase
    .from("availability_windows")
    .update(updateData)
    .eq("id", windowId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update availability window" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
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
