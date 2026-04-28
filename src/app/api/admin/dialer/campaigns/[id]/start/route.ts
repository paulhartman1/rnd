import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

type Params = {
  id: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await isFeatureEnabled("autodialer", user.email);
  if (!hasAccess) {
    return NextResponse.json({ error: "Feature not available" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Get campaign
  const { data: campaign, error: campaignError } = await adminClient
    .from("dialer_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Build query based on lead_filters
  const filters = campaign.lead_filters as Record<string, unknown>;
  let leads;
  let leadsError;

  // Check if specific lead IDs are provided
  if (filters.leadIds && Array.isArray(filters.leadIds) && filters.leadIds.length > 0) {
    // Use specific lead IDs
    const { data, error } = await adminClient
      .from("leads")
      .select("id")
      .in("id", filters.leadIds)
      .is("deleted_at", null);
    
    leads = data;
    leadsError = error;
  } else {
    // Use filter-based query
    let query = adminClient
      .from("leads")
      .select("id")
      .is("deleted_at", null);

    if (filters.status && Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    }

    if (filters.isHotLead === true) {
      query = query.eq("isHotLead", true);
    }

    // Filter by source
    if (filters.sourceIds && Array.isArray(filters.sourceIds) && filters.sourceIds.length > 0) {
      query = query.in("source_id", filters.sourceIds);
    }

    // Filter by assigned user
    if (filters.assignedUserIds && Array.isArray(filters.assignedUserIds) && filters.assignedUserIds.length > 0) {
      query = query.in("assigned_user_id", filters.assignedUserIds);
    }

    // Filter for unassigned leads only
    if (filters.unassignedOnly === true) {
      query = query.is("assigned_user_id", null);
    }

    // Filter by last contact date range
    if (filters.lastContactedDaysMin && typeof filters.lastContactedDaysMin === 'number') {
      // Min days ago means we want leads contacted AT MOST that many days ago
      // e.g., min=14 means last_contacted_at >= now() - 14 days
      query = query.gte("last_contacted_at", `now() - interval '${filters.lastContactedDaysMin} days'`);
    }

    if (filters.lastContactedDaysMax && typeof filters.lastContactedDaysMax === 'number') {
      // Max days ago means we want leads contacted AT LEAST that many days ago
      // e.g., max=30 means last_contacted_at <= now() - 30 days
      query = query.lte("last_contacted_at", `now() - interval '${filters.lastContactedDaysMax} days'`);
    }

    // Execute query to get matching leads
    const { data, error } = await query;
    leads = data;
    leadsError = error;
  }

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "No leads match campaign filters" }, { status: 400 });
  }

  // Verify at least one active agent exists (for assignment on contact)
  const { data: activeAgents, error: agentsError } = await adminClient
    .from("dialer_agent_settings")
    .select("user_id")
    .eq("is_active", true)
    .limit(1);

  if (agentsError) {
    return NextResponse.json({ error: agentsError.message }, { status: 500 });
  }

  if (!activeAgents || activeAgents.length === 0) {
    return NextResponse.json({ 
      error: "No active agents available. Please activate at least one agent before starting campaign." 
    }, { status: 400 });
  }

  // Create queue items with NULL assignment - leads will be assigned when agent makes first contact
  const queueItems = leads.map((lead) => ({
    campaign_id: id,
    lead_id: lead.id,
    status: "pending",
    attempts: 0,
    assigned_user_id: null,
  }));

  const { error: insertError } = await adminClient
    .from("dialer_queue")
    .upsert(queueItems, { onConflict: "campaign_id,lead_id", ignoreDuplicates: true });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Activate campaign
  const { error: updateError } = await adminClient
    .from("dialer_campaigns")
    .update({ is_active: true })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    leads_queued: leads.length,
    message: `Campaign started with ${leads.length} leads. Leads will be assigned to agents upon first contact.` 
  });
}
