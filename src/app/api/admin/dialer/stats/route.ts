import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

export async function GET() {
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

  // Get queue statistics
  const { data: queueStats } = await adminClient
    .from("dialer_queue")
    .select("status, campaign_id")
    .then((res) => {
      if (res.error || !res.data) return { data: null };
      
      const stats = {
        total: res.data.length,
        pending: res.data.filter(q => q.status === "pending").length,
        calling: res.data.filter(q => q.status === "calling").length,
        completed: res.data.filter(q => q.status === "completed").length,
        failed: res.data.filter(q => q.status === "failed").length,
        by_campaign: {} as Record<string, { pending: number; calling: number; completed: number; failed: number }>
      };

      res.data.forEach(item => {
        if (!stats.by_campaign[item.campaign_id]) {
          stats.by_campaign[item.campaign_id] = { pending: 0, calling: 0, completed: 0, failed: 0 };
        }
        const status = item.status as "pending" | "calling" | "completed" | "failed";
        if (status in stats.by_campaign[item.campaign_id]) {
          stats.by_campaign[item.campaign_id][status]++;
        }
      });

      return { data: stats };
    });

  // Get call logs statistics
  const { data: callLogs } = await adminClient
    .from("dialer_call_logs")
    .select("call_status, user_id, call_duration")
    .then((res) => {
      if (res.error || !res.data) return { data: null };

      const stats = {
        total_calls: res.data.length,
        answered: res.data.filter(c => c.call_status === "answered").length,
        no_answer: res.data.filter(c => c.call_status === "no-answer").length,
        busy: res.data.filter(c => c.call_status === "busy").length,
        failed: res.data.filter(c => c.call_status === "failed").length,
        by_agent: {} as Record<string, { total: number; answered: number }>
      };

      res.data.forEach(call => {
        if (call.user_id) {
          if (!stats.by_agent[call.user_id]) {
            stats.by_agent[call.user_id] = { total: 0, answered: 0 };
          }
          stats.by_agent[call.user_id].total++;
          if (call.call_status === "answered") {
            stats.by_agent[call.user_id].answered++;
          }
        }
      });

      return { data: stats };
    });

  return NextResponse.json({
    queue: queueStats || {},
    calls: callLogs || {}
  });
}
