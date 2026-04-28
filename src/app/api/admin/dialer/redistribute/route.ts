import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

export async function POST() {
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

  try {
    // Get active campaigns
    const { data: campaigns, error: campaignsError } = await adminClient
      .from("dialer_campaigns")
      .select("id")
      .eq("is_active", true);

    if (campaignsError) {
      return NextResponse.json({ error: campaignsError.message }, { status: 500 });
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        message: "No active campaigns",
        redistributed: 0
      });
    }

    const activeCampaignIds = campaigns.map(c => c.id);

    // Find pending leads assigned to OTHER agents in active campaigns
    const { data: availableLeads, error: leadsError } = await adminClient
      .from("dialer_queue")
      .select("id, assigned_user_id")
      .in("campaign_id", activeCampaignIds)
      .eq("status", "pending")
      .not("assigned_user_id", "eq", user.id)
      .limit(50); // Claim up to 50 leads at once

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    if (!availableLeads || availableLeads.length === 0) {
      return NextResponse.json({
        message: "No pending leads available from other agents",
        redistributed: 0
      });
    }

    // Reassign these leads to current user
    const leadIds = availableLeads.map(l => l.id);
    const { error: updateError } = await adminClient
      .from("dialer_queue")
      .update({ assigned_user_id: user.id })
      .in("id", leadIds);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      redistributed: availableLeads.length,
      message: `Claimed ${availableLeads.length} lead(s) from teammates`
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
