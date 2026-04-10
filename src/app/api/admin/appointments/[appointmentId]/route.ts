import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{
    appointmentId: string;
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

  const { appointmentId } = await params;
  const body = await request.json();
  const { title, description, startTime, endTime, status, location } = body;

  const updateData: Record<string, string | null> = {};

  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (startTime !== undefined) updateData.start_time = startTime;
  if (endTime !== undefined) updateData.end_time = endTime;
  if (status !== undefined) updateData.status = status;
  if (location !== undefined) updateData.location = location;

  const { error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", appointmentId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update appointment" },
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

  const { appointmentId } = await params;

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
