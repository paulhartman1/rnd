import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendNewLeadNotifications } from "@/lib/notifications";

/**
 * Parse a single address string into components, working backward from zip
 * Handles formats like:
 * - "123 Main St, Denver, CO 80202"
 * - "456 Oak Avenue, Boulder, CO, 80301"
 * - "789 Pine Street Denver CO 80202"
 * - "123 Main St Denver CO 80202-1234"
 */
function parseAddress(address: string): {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  // Remove extra whitespace, commas, and normalize
  let remaining = address.trim().replace(/\s+/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ');
  
  // Extract ZIP from the end: last 5 digits, or 5-4 format
  let zip: string | null = null;
  
  // Check for 5-digit zip at the end
  const fiveDigitMatch = remaining.match(/(\d{5})\s*$/);
  if (fiveDigitMatch) {
    zip = fiveDigitMatch[1];
    remaining = remaining.substring(0, remaining.length - fiveDigitMatch[0].length).trim();
    
    // Check if there's a -4 digit extension before the 5 digits
    const extMatch = remaining.match(/-?(\d{4})\s*$/);
    if (extMatch) {
      zip = `${extMatch[1]}-${zip}`;
      remaining = remaining.substring(0, remaining.length - extMatch[0].length).trim();
    }
  } else {
    // Check for xxxxx-xxxx format
    const extendedMatch = remaining.match(/(\d{5}-\d{4})\s*$/);
    if (extendedMatch) {
      zip = extendedMatch[1];
      remaining = remaining.substring(0, remaining.length - extendedMatch[0].length).trim();
    }
  }
  
  // Extract state from the end: 2 uppercase letters
  let state: string | null = null;
  const stateMatch = remaining.match(/\b([A-Z]{2})\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    remaining = remaining.substring(0, remaining.length - stateMatch[0].length).trim();
  }
  
  // Extract city from the end: everything up to the last space (one word)
  let city: string | null = null;
  const lastSpaceIndex = remaining.lastIndexOf(' ');
  if (lastSpaceIndex !== -1) {
    city = remaining.substring(lastSpaceIndex + 1).trim();
    remaining = remaining.substring(0, lastSpaceIndex).trim();
  }
  
  // Everything remaining is the street address
  const street = remaining || null;
  
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

  // Send notifications (SMS + Email) - don't wait for them to complete
  sendNewLeadNotifications({
    leadId: lead.id,
    fullName: lead.full_name,
    city: lead.city,
    state: lead.state,
    phone: lead.phone,
    propertyType: lead.property_type,
    streetAddress: lead.street_address,
    repairsNeeded: lead.repairs_needed,
    closeTimeline: lead.close_timeline,
  }).catch((err) => {
    // Log error but don't fail the request
    console.error("Notification error:", err);
  });

  return NextResponse.json({ success: true, lead }, { status: 201 });
}
