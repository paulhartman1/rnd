import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const queueItemId = new URL(request.url).searchParams.get("queueItemId");

    console.log('[Call Status] Received:', { callSid, callStatus, callDuration, queueItemId });

    if (!callSid || !callStatus) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      "queued": "initiated",
      "initiated": "initiated",
      "ringing": "ringing",
      "in-progress": "in-progress",
      "completed": "completed",
      "busy": "busy",
      "failed": "failed",
      "no-answer": "no-answer",
      "canceled": "canceled",
    };

    const mappedStatus = statusMap[callStatus.toLowerCase()] || callStatus;

    // Try to find existing call log
    let { data: callLog } = await adminClient
      .from("dialer_call_logs")
      .select("id, queue_id, lead_id, user_id, campaign_id")
      .eq("twilio_call_sid", callSid)
      .single();

    // If no call log exists and we have queueItemId, create one
    if (!callLog && queueItemId) {
      console.log('[Call Status] Creating new call log for queue item:', queueItemId);
      
      // Get queue item details
      const { data: queueItem } = await adminClient
        .from("dialer_queue")
        .select("lead_id, campaign_id, assigned_user_id")
        .eq("id", queueItemId)
        .single();

      if (queueItem) {
        const { data: newLog } = await adminClient
          .from("dialer_call_logs")
          .insert({
            queue_id: queueItemId,
            lead_id: queueItem.lead_id,
            campaign_id: queueItem.campaign_id,
            user_id: queueItem.assigned_user_id,
            twilio_call_sid: callSid,
            call_status: mappedStatus,
            call_duration: callDuration ? parseInt(callDuration, 10) : null,
            started_at: new Date().toISOString(),
            ended_at: ["completed", "busy", "failed", "no-answer", "canceled"].includes(mappedStatus)
              ? new Date().toISOString()
              : null,
          })
          .select("id, queue_id, lead_id")
          .single();
        
        callLog = newLog || null;
      }
    } else if (callLog) {
      // Update existing call log
      await adminClient
        .from("dialer_call_logs")
        .update({
          call_status: mappedStatus,
          call_duration: callDuration ? parseInt(callDuration, 10) : null,
          ended_at: ["completed", "busy", "failed", "no-answer", "canceled"].includes(mappedStatus)
            ? new Date().toISOString()
            : null,
        })
        .eq("twilio_call_sid", callSid);
    }

    if (!callLog) {
      console.error('[Call Status] No call log found or created for:', callSid);
      return new NextResponse("", { status: 200 });
    }

    // Update queue status
    if (callLog.queue_id) {
      let queueStatus = "calling";

      if (mappedStatus === "completed" || mappedStatus === "answered") {
        queueStatus = "completed";
        
        // Update lead status to "contacted"
        if (callLog.lead_id) {
          await adminClient
            .from("leads")
            .update({ status: "contacted" })
            .eq("id", callLog.lead_id);
        }
      } else if (["failed", "no-answer", "busy", "canceled"].includes(mappedStatus)) {
        // Check attempts - if >= 3, mark as failed, otherwise reset to pending
        const { data: queueItem } = await adminClient
          .from("dialer_queue")
          .select("attempts")
          .eq("id", callLog.queue_id)
          .single();

        const attempts = queueItem?.attempts || 0;
        
        if (attempts >= 3) {
          queueStatus = "failed";
        } else {
          queueStatus = "pending"; // Retry
        }
      }

      await adminClient
        .from("dialer_queue")
        .update({ 
          status: queueStatus,
          assigned_user_id: queueStatus === "pending" ? null : undefined,
        })
        .eq("id", callLog.queue_id);
    }

    return new NextResponse("", { status: 200 });
  } catch (error) {
    console.error("Error processing call status:", error);
    // Return 200 to prevent Twilio retries
    return new NextResponse("", { status: 200 });
  }
}
