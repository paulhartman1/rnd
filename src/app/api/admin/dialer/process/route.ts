import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";
import twilio from "twilio";

function normalizePhone(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length > 10) {
    return `+${digitsOnly}`;
  }

  return "";
}

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

  const queueItems: any[] = [];
  const errors: string[] = [];

  try {
    // Get active campaigns ordered by priority
    const { data: campaigns, error: campaignsError } = await adminClient
      .from("dialer_campaigns")
      .select("id, name, priority")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (campaignsError) {
      return NextResponse.json({ error: campaignsError.message }, { status: 500 });
    }

    const activeCampaignIds = campaigns.map((campaign) => campaign.id);

    if (!campaigns || campaigns.length === 0) {
      console.log('[Dialer] No active campaigns found');
      return NextResponse.json({ 
        message: "No active campaigns",
        calls_initiated: 0,
        agents_active: 0
      });
    }

    console.log(`[Dialer] Found ${campaigns.length} active campaign(s)`, campaigns.map(c => c.name));

    // Get agent settings for current user
    const { data: agentSettings, error: agentsError } = await adminClient
      .from("dialer_agent_settings")
      .select("user_id, max_concurrent_calls")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (agentsError) {
      return NextResponse.json({ error: agentsError.message }, { status: 500 });
    }

    if (!agentSettings) {
      console.log('[Dialer] Current user is not an active agent');
      return NextResponse.json({
        message: "User is not configured as an active agent",
        queueItems: [],
        callsAvailable: 0
      });
    }

    console.log(`[Dialer] Agent ${user.id}: max ${agentSettings.max_concurrent_calls} concurrent calls`);

    // Check current capacity for this agent
    const agent = agentSettings;
    
    // Count current active calls for this agent
    const { count: activeCallsCount } = await adminClient
      .from("dialer_queue")
      .select("*", { count: "exact", head: true })
      .eq("assigned_user_id", agent.user_id)
      .eq("status", "calling");

    const currentCalls = activeCallsCount || 0;
    const availableSlots = agent.max_concurrent_calls - currentCalls;

    console.log(`[Dialer] Agent ${agent.user_id}: ${currentCalls}/${agent.max_concurrent_calls} calls, ${availableSlots} slots available`);

    if (availableSlots <= 0) {
      console.log(`[Dialer] Agent ${agent.user_id} at capacity`);
      return NextResponse.json({
        message: "Agent at capacity",
        queueItems: [],
        callsAvailable: 0
      });
    }

    // Get pending queue items assigned to this user
    const { data: pendingItems, error: queueError } = await adminClient
      .from("dialer_queue")
      .select(`
        id,
        lead_id,
        campaign_id,
        leads (
          id,
          full_name,
          phone,
          email,
          street_address,
          status,
          owner_notes
        )
      `)
      .in("campaign_id", activeCampaignIds)
      .eq("status", "pending")
      // Pull leads assigned to this agent OR not yet assigned to anyone.
      // NOTE: .or() is NULL-aware here; a plain .neq/.eq filter excludes NULL rows.
      .or(`assigned_user_id.eq.${user.id},assigned_user_id.is.null`)
      .order("created_at", { ascending: true })
      .limit(availableSlots);

    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 500 });
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('[Dialer] No pending queue items assigned to this agent');
      return NextResponse.json({
        message: "No pending items assigned to you. All your leads have been called.",
        queueItems: [],
        callsAvailable: 0
      });
    }

    // Fetch phone numbers for all leads in pending items
    const leadIds = pendingItems.map(item => item.lead_id).filter(Boolean);
    const { data: phones, error: phonesError } = await adminClient
      .from("lead_phones")
      .select("*")
      .in("lead_id", leadIds)
      .order("display_order", { ascending: true });

    if (phonesError) {
      console.error('[Dialer] Failed to fetch lead phones:', phonesError);
    }

    // Group phones by lead_id
    const phonesByLeadId: Record<string, any[]> = {};
    if (phones) {
      phones.forEach(phone => {
        if (!phonesByLeadId[phone.lead_id]) {
          phonesByLeadId[phone.lead_id] = [];
        }
        phonesByLeadId[phone.lead_id].push(phone);
      });
    }

    // Attach phones to leads
    const itemsWithPhones = pendingItems.map(item => ({
      ...item,
      leads: item.leads ? {
        ...item.leads,
        phones: phonesByLeadId[item.lead_id] || []
      } : null
    }));

    console.log(`[Dialer] Returning ${itemsWithPhones.length} pre-assigned queue items for browser calling`);

    return NextResponse.json({
      success: true,
      queueItems: itemsWithPhones,
      callsAvailable: availableSlots,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
