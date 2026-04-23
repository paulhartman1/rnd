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

    // Update call log
    const { data: callLog, error: logError } = await adminClient
      .from("dialer_call_logs")
      .update({
        call_status: mappedStatus,
        call_duration: callDuration ? parseInt(callDuration, 10) : null,
        ended_at: ["completed", "busy", "failed", "no-answer", "canceled"].includes(mappedStatus)
          ? new Date().toISOString()
          : null,
      })
      .eq("twilio_call_sid", callSid)
      .select("queue_id, lead_id")
      .single();

    if (logError || !callLog) {
      console.error("Failed to update call log:", logError);
      // Don't fail the request - Twilio will retry
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
          assigned_agent_id: queueStatus === "pending" ? null : undefined,
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
