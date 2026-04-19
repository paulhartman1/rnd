import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ManualLeadPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  ownerNotes?: string;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const queryClient = adminClient ?? supabase;

    const { data: leads, error } = await queryClient
      .from("leads")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 }
      );
    }

    return NextResponse.json({ leads: leads || [] });
  } catch (error) {
    console.error("GET /api/admin/leads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as ManualLeadPayload;

  // Validate at least one contact method
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Either phone or email is required." },
      { status: 400 }
    );
  }

  // Validate email format if provided
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Get the 'manual' source ID
  const { data: manualSource, error: sourceError } = await supabase
    .from("sources")
    .select("id")
    .eq("name", "manual")
    .single();

  if (sourceError || !manualSource) {
    return NextResponse.json(
      { error: "Manual source not found. Please run migrations." },
      { status: 500 }
    );
  }

  // Create the lead with minimal required fields
  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      full_name: body.fullName?.trim() || null,
      email,
      phone,
      street_address: body.streetAddress?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      postal_code: body.postalCode?.trim() || null,
      owner_notes: body.ownerNotes?.trim() || null,
      source_id: manualSource.id,
      sms_consent: false,
      status: "new",
      // All optional fields from form intake
      listed_with_agent: null,
      property_type: null,
      owns_land: null,
      repairs_needed: null,
      close_timeline: null,
      sell_reason: null,
      acceptable_offer: null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json(
      { error: "Unable to create lead." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, lead });
}
