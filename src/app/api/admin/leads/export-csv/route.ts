import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const queryClient = adminClient ?? supabase;

    const { data: leads, error } = await queryClient
      .from("leads")
      .select(`
        id,
        full_name,
        email,
        phone,
        street_address,
        city,
        state,
        postal_code,
        status
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 }
      );
    }

    // Fetch properties for each lead
    const leadIds = (leads ?? []).map((lead) => lead.id);
    type PropertySummary = {
      street_address?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      apn?: string;
      county?: string;
    };
    let propertiesByLead: Record<string, PropertySummary[]> = {};
    
    if (leadIds.length > 0) {
      const { data: propertiesData, error: propsError } = await queryClient
        .from("properties")
        .select(`
          id,
          lead_id,
          street_address,
          city,
          state,
          postal_code,
          apn,
          county,
          property_type_detail,
          bedroom_count,
          bathroom_count,
          total_building_area_sqft,
          lot_size_sqft,
          year_built,
          zoning_code,
          owner_occupied,
          is_vacant,
          self_managed,
          opt_out
        `)
        .in("lead_id", leadIds);

      if (propsError) {
        console.error("Error fetching properties:", propsError);
      } else {
        propertiesByLead = (propertiesData ?? []).reduce((acc, prop) => {
          const summary: PropertySummary = {
            street_address: prop.street_address,
            city: prop.city,
            state: prop.state,
            postal_code: prop.postal_code,
            apn: prop.apn,
            county: prop.county,
          };
          if (!acc[prop.lead_id]) {
            acc[prop.lead_id] = [];
          }
          acc[prop.lead_id].push(summary);
          return acc;
        }, {} as Record<string, PropertySummary[]>);
      }
    }

// Fetch phone numbers for each lead from lead_phones table
    const leadPhoneNumbers: Record<string, string[]> = {};
    if (leadIds.length > 0) {
      const phonesResult: any = await queryClient
        .from("lead_phones")
        .select("lead_id, phone_number, is_dnc");
      const phonesData = phonesResult?.data;
      const phonesError = phonesResult?.error;
      
      if (phonesError) {
        console.error("Error fetching phone numbers:", phonesError);
      } else {
        // Group phones by lead_id, excluding DNC-opted out numbers
        (phonesData ?? []).forEach((phone: any) => {
          if (!phone.is_dnc) {
            if (!leadPhoneNumbers[phone.lead_id]) {
              leadPhoneNumbers[phone.lead_id] = [];
            }
            leadPhoneNumbers[phone.lead_id].push(phone.phone_number);
          }
        });
      }
    }

    // Generate CSV
    const rows = (leads ?? []).map((lead) => {
      const properties = propertiesByLead[lead.id] || [];
      const primaryProperty = properties[0];
      
      // Get primary property info (first property)
      const propStreet = primaryProperty?.street_address || "";
      const propCity = primaryProperty?.city || "";
      const propState = primaryProperty?.state || "";
      const propPostal = primaryProperty?.postal_code || "";
      const propAPN = primaryProperty?.apn || "";
      const propCounty = primaryProperty?.county || "";
      
      // Get phone numbers for this lead
      const phoneNumbers = leadPhoneNumbers[lead.id] || [];
      const phoneDisplay = phoneNumbers.length > 0 
        ? phoneNumbers.join("; ")
        : (lead.phone || "");
      
      return [
        lead.id,
        `"${(lead.full_name || "").replace(/"/g, '""')}"`,
        `"${(lead.email || "").replace(/"/g, '""')}"`,
        `"${(lead.phone || "").replace(/"/g, '""')}"`,
        `"${(lead.street_address || "").replace(/"/g, '""')}"`,
        `"${(lead.city || "").replace(/"/g, '""')}"`,
        `"${(lead.state || "").replace(/"/g, '""')}"`,
        `"${(lead.postal_code || "").replace(/"/g, '""')}"`,
        `"${phoneDisplay}"`,
        `"${lead.status || ""}"`,
        `"${propStreet.replace(/"/g, '""')}"`,
        `"${propCity.replace(/"/g, '""')}"`,
        `"${propState.replace(/"/g, '""')}"`,
        `"${propPostal.replace(/"/g, '""')}"`,
        `"${propAPN.replace(/"/g, '""')}"`,
        `"${propCounty.replace(/"/g, '""')}"`,
      ];
    });

    // CSV header
    const headers = [
      "Lead ID",
      "Full Name",
      "Email",
      "Phone",
      "Lead Street Address",
      "Lead City",
      "Lead State",
      "Lead Postal Code",
      "Phone Numbers",
      "Status",
      "Property Street Address",
      "Property City",
      "Property State",
      "Property Postal Code",
      "Property APN",
      "Property County",
    ];

    // Build CSV string
    const csvRows = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `leads-export-${timestamp}.csv`;

    return new NextResponse(csvRows, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}