import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  id: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  
  // Get current user for assignment
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // Get the queue item to find the associated lead
    const { data: queueItem, error: fetchError } = await adminClient
      .from("dialer_queue")
      .select("lead_id")
      .eq("id", id)
      .single();

    if (fetchError || !queueItem) {
      console.error("[Queue Complete] Error fetching queue item:", fetchError);
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 }
      );
    }

    // Get the lead to check if it's already assigned
    const { data: lead, error: leadFetchError } = await adminClient
      .from("leads")
      .select("assigned_user_id")
      .eq("id", queueItem.lead_id)
      .single();

    if (leadFetchError || !lead) {
      console.error("[Queue Complete] Error fetching lead:", leadFetchError);
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // If lead is not assigned, assign it to the current user (calling agent)
    if (!lead.assigned_user_id) {
      const { error: assignError } = await adminClient
        .from("leads")
        .update({ 
          assigned_user_id: user.id,
          last_contacted_at: new Date().toISOString()
        })
        .eq("id", queueItem.lead_id);

      if (assignError) {
        console.error("[Queue Complete] Error assigning lead:", assignError);
        // Don't fail the request if assignment fails, just log it
      }
    } else {
      // Lead is already assigned, just update last_contacted_at
      const { error: updateContactError } = await adminClient
        .from("leads")
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", queueItem.lead_id);

      if (updateContactError) {
        console.error("[Queue Complete] Error updating last contact:", updateContactError);
      }
    }

    // Mark queue item as completed
    const { error } = await adminClient
      .from("dialer_queue")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[Queue Complete] Error updating queue item:", error);
      return NextResponse.json(
        { error: "Failed to update queue item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Queue Complete] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
