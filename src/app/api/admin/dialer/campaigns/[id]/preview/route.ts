import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

type Params = {
  id: string;
};

export async function GET(
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

  // Build query based on lead_filters (same logic as start endpoint)
  const filters = campaign.lead_filters as Record<string, unknown>;
  let leads;
  let leadsError;

  if (filters.leadIds && Array.isArray(filters.leadIds) && filters.leadIds.length > 0) {
    const { data, error } = await adminClient
      .from("leads")
      .select("id, priority_score, computed_tags")
      .in("id", filters.leadIds)
      .is("deleted_at", null);
    
    leads = data;
    leadsError = error;
  } else {
    let query = adminClient
      .from("leads")
      .select("id, priority_score, computed_tags")
      .is("deleted_at", null);

    if (filters.status && Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    }

    if (filters.isHotLead === true) {
      query = query.eq("isHotLead", true);
    }

    if (filters.sourceIds && Array.isArray(filters.sourceIds) && filters.sourceIds.length > 0) {
      query = query.in("source_id", filters.sourceIds);
    }

    if (filters.assignedUserIds && Array.isArray(filters.assignedUserIds) && filters.assignedUserIds.length > 0) {
      query = query.in("assigned_user_id", filters.assignedUserIds);
    }

    if (filters.unassignedOnly === true) {
      query = query.is("assigned_user_id", null);
    }

    if (filters.lastContactedDaysMin && typeof filters.lastContactedDaysMin === 'number') {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - filters.lastContactedDaysMin);
      query = query.gte("last_contacted_at", minDate.toISOString());
    }

    if (filters.lastContactedDaysMax && typeof filters.lastContactedDaysMax === 'number') {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() - filters.lastContactedDaysMax);
      query = query.lte("last_contacted_at", maxDate.toISOString());
    }

    // Filter by creation date range (same logic as start route)
    if (filters.createdDaysMin && typeof filters.createdDaysMin === 'number') {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - filters.createdDaysMin);
      query = query.lte("created_at", minDate.toISOString());
    }

    if (filters.createdDaysMax && typeof filters.createdDaysMax === 'number') {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() - filters.createdDaysMax);
      query = query.gte("created_at", maxDate.toISOString());
    }

    if (filters.priorityScoreMin && typeof filters.priorityScoreMin === 'number') {
      query = query.gte("priority_score", filters.priorityScoreMin);
    }

    if (filters.hasComputedTags && Array.isArray(filters.hasComputedTags) && filters.hasComputedTags.length > 0) {
      query = query.contains("computed_tags", filters.hasComputedTags);
    }

    const { data, error } = await query;
    leads = data;
    leadsError = error;
  }

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leads) {
    return NextResponse.json({ 
      count: 0,
      avgPriorityScore: null,
      maxPriorityScore: null,
      minPriorityScore: null,
      tagDistribution: {}
    });
  }

  // Calculate statistics
  const scores = leads.map(l => l.priority_score).filter((s): s is number => s !== null);
  const avgPriorityScore = scores.length > 0 
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : null;
  const maxPriorityScore = scores.length > 0 ? Math.max(...scores) : null;
  const minPriorityScore = scores.length > 0 ? Math.min(...scores) : null;

  // Count tag distribution
  const tagCounts: Record<string, number> = {};
  leads.forEach(lead => {
    if (lead.computed_tags && Array.isArray(lead.computed_tags)) {
      lead.computed_tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  return NextResponse.json({
    count: leads.length,
    avgPriorityScore,
    maxPriorityScore,
    minPriorityScore,
    tagDistribution: tagCounts,
  });
}
