import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{
    typeId: string;
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

  const { typeId } = await params;
  const body = await request.json();
  const { name, description, defaultDurationMinutes, displayOrder, isActive } =
    body;

  const updateData: Record<string, string | number | boolean | null> = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (defaultDurationMinutes !== undefined)
    updateData.default_duration_minutes = defaultDurationMinutes;
  if (displayOrder !== undefined) updateData.display_order = displayOrder;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { error } = await supabase
    .from("appointment_types")
    .update(updateData)
    .eq("id", typeId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update appointment type" },
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

  const { typeId } = await params;

  const { error } = await supabase
    .from("appointment_types")
    .delete()
    .eq("id", typeId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete appointment type" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
