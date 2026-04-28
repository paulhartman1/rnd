import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

type AssignRequest = {
  queueItemIds: string[];
  userId: string | null; // null to unassign
};

export async function POST(request: Request) {
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
    const body: AssignRequest = await request.json();
    const { queueItemIds, userId } = body;

    if (!queueItemIds || !Array.isArray(queueItemIds) || queueItemIds.length === 0) {
      return NextResponse.json({ error: "queueItemIds array is required" }, { status: 400 });
    }

    // If assigning to a user, verify they're an active agent
    if (userId) {
      const { data: agent, error: agentError } = await adminClient
        .from("dialer_agent_settings")
        .select("user_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (agentError || !agent) {
        return NextResponse.json({ 
          error: "Target user is not an active agent" 
        }, { status: 400 });
      }
    }

    // Update assignment
    const { error: updateError, count } = await adminClient
      .from("dialer_queue")
      .update({ assigned_user_id: userId })
      .in("id", queueItemIds)
      .eq("status", "pending"); // Only reassign pending items

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: count || 0,
      message: userId 
        ? `Assigned ${count || 0} lead(s) to agent`
        : `Unassigned ${count || 0} lead(s)`
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
