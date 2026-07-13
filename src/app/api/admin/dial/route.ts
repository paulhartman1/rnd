import { NextResponse } from "next/server";
import twilio from "twilio";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const quickDialEnabled = await isFeatureEnabled("quick_dial");
  
  if (!quickDialEnabled) {
    return NextResponse.json(
      { error: "Quick dial feature is not enabled" },
      { status: 403 }
    );
  }

  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      return NextResponse.json(
        { error: "Phone number cannot be empty" },
        { status: 400 }
      );
    }

    // Check if this phone number belongs to an existing lead
    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());
    
    let matchedLead = null;
    if (supabase) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, full_name, status, phone")
        .eq("phone", trimmedPhone)
        .is("deleted_at", null)
        .single();
      
      if (lead) {
        matchedLead = {
          id: lead.id,
          name: lead.full_name,
          status: lead.status,
        };
      }
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    const apiKeySid = process.env.TWILIO_API_KEY_SID ?? "";
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET ?? "";
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    const fromPhone = process.env.TWILIO_PHONE_NUMBER ?? "";
    const forwardToPhone = process.env.TWILIO_FORWARD_TO_NUMBER ?? "";
    const twilioCallUrl = process.env.TWILIO_CALL_URL ?? "";

    if (!accountSid || (!apiKeySid && !authToken) || !fromPhone) {
      return NextResponse.json(
        {
          error:
            "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET (or TWILIO_AUTH_TOKEN), and TWILIO_PHONE_NUMBER.",
        },
        { status: 500 }
      );
    }

    if (!twilioCallUrl && !forwardToPhone) {
      return NextResponse.json(
        {
          error:
            "Missing call target. Set TWILIO_FORWARD_TO_NUMBER for live bridged calls, or TWILIO_CALL_URL for custom TwiML.",
        },
        { status: 500 }
      );
    }

    // Use API key if available, otherwise fall back to auth token
    const client =
      apiKeySid && apiKeySecret
        ? twilio(apiKeySid, apiKeySecret, { accountSid })
        : twilio(accountSid, authToken);

    const callConfig: {
      to: string;
      from: string;
      url?: string;
      twiml?: string;
    } = {
      to: trimmedPhone,
      from: fromPhone,
    };

    if (twilioCallUrl) {
      callConfig.url = twilioCallUrl;
    } else {
      callConfig.twiml = `<Response><Dial answerOnBridge="true">${forwardToPhone}</Dial></Response>`;
    }

    const call = await client.calls.create(callConfig);

    return NextResponse.json({ 
      success: true, 
      callSid: call.sid,
      matchedLead,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Twilio call failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
