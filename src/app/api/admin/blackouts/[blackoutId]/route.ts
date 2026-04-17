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
  const { reason, start_time, end_time } = body;

  const updateData: Record<string, string | null> = {};

  if (reason !== undefined) updateData.reason = reason;
  if (start_time !== undefined) updateData.start_time = start_time;
  if (end_time !== undefined) updateData.end_time = end_time;

  const { data, error } = await supabase
    .from("blackout_periods")
    .update(updateData)
    .eq("id", blackoutId)
    .select()
    .single();

  if (error) {
    console.error("Supabase error updating blackout:", error);
    return NextResponse.json(
      { error: "Failed to update blackout period", details: error.message },
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
