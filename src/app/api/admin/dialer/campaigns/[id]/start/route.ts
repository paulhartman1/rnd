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
  let query = adminClient
    .from("leads")
    .select("id")
    .is("deleted_at", null);

  const filters = campaign.lead_filters as Record<string, unknown>;

  if (filters.status && Array.isArray(filters.status)) {
    query = query.in("status", filters.status);
  }

  if (filters.isHotLead === true) {
    query = query.eq("isHotLead", true);
  }

  // Execute query to get matching leads
  const { data: leads, error: leadsError } = await query;

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "No leads match campaign filters" }, { status: 400 });
  }

  // Insert leads into queue (ON CONFLICT DO NOTHING to prevent duplicates)
  const queueItems = leads.map((lead) => ({
    campaign_id: id,
    lead_id: lead.id,
    status: "pending",
    attempts: 0,
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
    message: `Campaign started with ${leads.length} leads in queue` 
  });
}
