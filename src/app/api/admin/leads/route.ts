import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Parse a single address string into components
 * Handles formats like:
 * - "123 Main St, Denver, CO 80202"
 * - "456 Oak Avenue, Boulder, CO, 80301"
 * - "789 Pine Street Denver CO 80202"
 */
function parseAddress(address: string): {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  // Remove extra whitespace and normalize
  const cleaned = address.trim().replace(/\s+/g, ' ');
  
  // Try to extract ZIP code (5 digits, optionally followed by -4 digits)
  const zipMatch = cleaned.match(/\b(\d{5}(?:-\d{4})?)\b/);
  const zip = zipMatch ? zipMatch[1] : null;
  
  // Remove ZIP from string for further parsing
  let remaining = zip ? cleaned.replace(zip, '').trim() : cleaned;
  
  // Try to extract state (2-letter code at the end)
  const stateMatch = remaining.match(/\b([A-Z]{2})\b(?:[,\s]*)?$/);
  const state = stateMatch ? stateMatch[1] : null;
  
  // Remove state from string
  remaining = state ? remaining.replace(new RegExp(`\\b${state}\\b[,\\s]*$`), '').trim() : remaining;
  
  // Remove trailing comma if present
  remaining = remaining.replace(/,\s*$/, '').trim();
  
  // Split remaining by comma - street is first part, city is last part
  const parts = remaining.split(',').map(p => p.trim()).filter(p => p);
  
  let street: string | null = null;
  let city: string | null = null;
  
  if (parts.length === 1) {
    // Only one part - could be street or city, assume street
    street = parts[0] || null;
  } else if (parts.length === 2) {
    // Two parts - street, city
    street = parts[0] || null;
    city = parts[1] || null;
  } else if (parts.length > 2) {
    // Multiple parts - first is street, last is city
    street = parts[0] || null;
    city = parts[parts.length - 1] || null;
  }
  
  return { street, city, state, zip };
}

type ManualLeadPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  // Support both individual fields and single address field
  address?: string; // Single address field from cold calling agency
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  negotiability?: string; // "Yes" or "No"
  ownerNotes?: string;
  notes?: string; // Alternative field name for notes
  sourceName?: string;
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

  // Phone is required (email is optional for cold calling agency)
  const phone = body.phone?.trim() || null;
  if (!phone) {
    return NextResponse.json(
      { error: "Phone is required." },
      { status: 400 }
    );
  }

  // Email is optional
  const email = body.email?.trim() || null;

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

  // Get the source ID based on the provided sourceName (defaults to 'manual')
  const sourceName = body.sourceName || "manual";
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id")
    .eq("name", sourceName)
    .single();

  if (sourceError || !source) {
    return NextResponse.json(
      { error: `Source '${sourceName}' not found. Please run migrations.` },
      { status: 500 }
    );
  }

  // Handle address: prefer individual fields, fall back to parsing single address field
  let streetAddress = body.streetAddress?.trim() || null;
  let city = body.city?.trim() || null;
  let state = body.state?.trim() || null;
  let postalCode = body.postalCode?.trim() || null;
  
  // If no individual fields but we have a single address, try to parse it
  if (!streetAddress && !city && !state && !postalCode && body.address?.trim()) {
    const parsed = parseAddress(body.address.trim());
    streetAddress = parsed.street;
    city = parsed.city;
    state = parsed.state;
    postalCode = parsed.zip;
  }
  
  // Handle notes field (support both field names)
  const ownerNotes = body.ownerNotes?.trim() || body.notes?.trim() || null;
  
  // Handle negotiability as acceptable_offer
  const acceptableOffer = body.negotiability?.trim() || null;

  // Create the lead with minimal required fields
  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      full_name: body.fullName?.trim() || null,
      email,
      phone,
      street_address: streetAddress,
      city,
      state,
      postal_code: postalCode,
      owner_notes: ownerNotes,
      source_id: source.id,
      sms_consent: false,
      status: "new",
      // All optional fields from form intake
      listed_with_agent: null,
      property_type: null,
      owns_land: null,
      repairs_needed: null,
      close_timeline: null,
      sell_reason: null,
      acceptable_offer: acceptableOffer,
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

  // Auto-create property record only if lead has complete address data
  if (lead && lead.street_address && lead.city && lead.state && lead.postal_code) {
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .insert({
        lead_id: lead.id,
        street_address: lead.street_address,
        city: lead.city,
        state: lead.state,
        postal_code: lead.postal_code,
        apn: null,
        property_type: lead.property_type,
        notes: null,
      })
      .select()
      .single();

    if (propertyError) {
      console.error("Property creation error:", propertyError);
      // Don't fail the lead creation, just log the error
    } else if (property) {
      // Geocode the property immediately (imported from geocoding lib)
      const { geocodeAddress } = await import("@/lib/geocoding");
      const geocodeResult = await geocodeAddress(
        property.street_address,
        property.city || "",
        property.state || "",
        property.postal_code || ""
      );

      if ('latitude' in geocodeResult) {
        // Update property with geocoding results
        await supabase
          .from("properties")
          .update({
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude,
            geocoded_at: new Date().toISOString(),
            geocode_source: geocodeResult.source,
          })
          .eq('id', property.id);
        
        console.log(`Geocoded property ${property.id}: ${geocodeResult.displayName}`);
      } else {
        console.log(`Failed to geocode property ${property.id}: ${geocodeResult.error}`);
      }
    }
  }

  return NextResponse.json({ success: true, lead }, { status: 201 });
}
