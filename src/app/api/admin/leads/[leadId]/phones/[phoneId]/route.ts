import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  leadId: string;
  phoneId: string;
};

// PATCH - Update phone validation status, set as primary, etc.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { leadId, phoneId } = await params;
  const body = await request.json();
  const {
    validationStatus,
    validationNotes,
    isPrimary,
    isDnc,
    phoneType,
    displayOrder,
  } = body;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Verify phone belongs to lead
  const { data: existingPhone, error: checkError } = await supabase
    .from("lead_phones")
    .select("*")
    .eq("id", phoneId)
    .eq("lead_id", leadId)
    .single();

  if (checkError || !existingPhone) {
    return NextResponse.json(
      { error: "Phone number not found for this lead" },
      { status: 404 },
    );
  }

  // Build update object
  const updates: any = {};

  if (validationStatus !== undefined) {
    updates.validation_status = validationStatus;
  }
  if (validationNotes !== undefined) {
    updates.validation_notes = validationNotes;
  }
  if (isPrimary !== undefined) {
    updates.is_primary = isPrimary;
  }
  if (isDnc !== undefined) {
    updates.is_dnc = isDnc;
  }
  if (phoneType !== undefined) {
    updates.phone_type = phoneType;
  }
  if (displayOrder !== undefined) {
    updates.display_order = displayOrder;
  }

  // Update phone
  const { data: phone, error } = await supabase
    .from("lead_phones")
    .update(updates)
    .eq("id", phoneId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ phone });
}

// DELETE - Remove a phone number
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const { leadId, phoneId } = await params;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Check if it's the primary phone
  const { data: phone } = await supabase
    .from("lead_phones")
    .select("is_primary")
    .eq("id", phoneId)
    .eq("lead_id", leadId)
    .single();

  if (phone?.is_primary) {
    return NextResponse.json(
      { error: "Cannot delete primary phone number" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("lead_phones")
    .delete()
    .eq("id", phoneId)
    .eq("lead_id", leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
