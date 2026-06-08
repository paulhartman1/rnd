import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  leadId: string;
};

// GET - Fetch all phone numbers for a lead
export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const { leadId } = await params;
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data: phones, error } = await supabase
    .from("lead_phones")
    .select("*")
    .eq("lead_id", leadId)
    .order("display_order", { ascending: true })
    .order("is_primary", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ phones });
}

// POST - Add a new phone number to a lead
export async function POST(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { leadId } = await params;
  const body = await request.json();
  const { phoneNumber, phoneType, isPrimary, isDnc, displayOrder } = body;

  if (!phoneNumber) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Check if lead exists
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Insert new phone
  const { data: phone, error } = await supabase
    .from("lead_phones")
    .insert({
      lead_id: leadId,
      phone_number: phoneNumber,
      phone_type: phoneType || null,
      is_primary: isPrimary || false,
      is_dnc: isDnc || false,
      display_order: displayOrder || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ phone }, { status: 201 });
}
