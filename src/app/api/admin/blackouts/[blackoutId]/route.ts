import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{
    blackoutId: string;
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

  const { blackoutId } = await params;
  const body = await request.json();
  const { title, startTime, endTime } = body;

  const updateData: Record<string, string> = {};

  if (title !== undefined) updateData.title = title;
  if (startTime !== undefined) updateData.start_time = startTime;
  if (endTime !== undefined) updateData.end_time = endTime;

  const { error } = await supabase
    .from("blackout_periods")
    .update(updateData)
    .eq("id", blackoutId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update blackout period" },
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

  const { blackoutId } = await params;

  const { error } = await supabase
    .from("blackout_periods")
    .delete()
    .eq("id", blackoutId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete blackout period" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
