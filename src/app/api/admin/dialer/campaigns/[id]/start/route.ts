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

  // Get agents for pre-assignment
  let agentsQuery = adminClient
    .from("dialer_agent_settings")
    .select("user_id")
    .eq("is_active", true);

  // If specific agent IDs are specified in filters, use those
  if (filters.agentIds && Array.isArray(filters.agentIds) && filters.agentIds.length > 0) {
    agentsQuery = agentsQuery.in("user_id", filters.agentIds);
  }

  const { data: activeAgents, error: agentsError } = await agentsQuery;

  if (agentsError) {
    return NextResponse.json({ error: agentsError.message }, { status: 500 });
  }

  if (!activeAgents || activeAgents.length === 0) {
    return NextResponse.json({ 
      error: filters.agentIds && Array.isArray(filters.agentIds) && filters.agentIds.length > 0
        ? "Specified agents are not active or do not exist"
        : "No active agents available. Please activate at least one agent before starting campaign." 
    }, { status: 400 });
  }

  // Distribute leads round-robin among active agents
  const queueItems = leads.map((lead, index) => ({
    campaign_id: id,
    lead_id: lead.id,
    status: "pending",
    attempts: 0,
    assigned_user_id: activeAgents[index % activeAgents.length].user_id,
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
    agents_assigned: activeAgents.length,
    message: `Campaign started with ${leads.length} leads distributed among ${activeAgents.length} agent(s)` 
  });
}
