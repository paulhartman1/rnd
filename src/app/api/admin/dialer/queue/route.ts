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

  const { data: queue, error } = await adminClient
    .from("dialer_queue")
    .select(`
      *,
      campaign:dialer_campaigns(id, name),
      lead:leads(id, full_name, phone, street_address)
    `)
    .order("created_at", { ascending: true });

  // Get user emails for assigned agents
  if (queue) {
    const userIds = queue.map(q => q.assigned_user_id).filter(Boolean);
    const { data: users } = await adminClient.auth.admin.listUsers();
    
    const queueWithUsers = queue.map(item => {
      const user = users?.users.find(u => u.id === item.assigned_user_id);
      return {
        ...item,
        agent: user ? { id: user.id, name: user.email } : null
      };
    });
    
    return NextResponse.json({ queue: queueWithUsers });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ queue });
}
