import { NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  leadId: string;
  phoneId: string;
};

function normalizePhone(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    const normalized = `+${trimmed.slice(1).replace(/\D/g, "")}`;
    return normalized;
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

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { leadId, phoneId } = await params;
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Get the phone number
  const { data: phone, error: phoneError } = await supabase
    .from("lead_phones")
    .select("phone_number, lead_id")
    .eq("id", phoneId)
    .eq("lead_id", leadId)
    .single();

  if (phoneError || !phone) {
    return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
  }

  const toPhone = normalizePhone(phone.phone_number);
  if (!toPhone) {
    return NextResponse.json(
      { error: "Phone number is invalid for outbound calling" },
      { status: 400 }
    );
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

  try {
    // Use API key if available, otherwise fall back to auth token
    const client = apiKeySid && apiKeySecret
      ? twilio(apiKeySid, apiKeySecret, { accountSid })
      : twilio(accountSid, authToken);

    const callConfig: {
      to: string;
      from: string;
      url?: string;
      twiml?: string;
    } = {
      to: toPhone,
      from: fromPhone,
    };

    if (twilioCallUrl) {
      callConfig.url = twilioCallUrl;
    } else {
      callConfig.twiml = `<Response><Dial answerOnBridge="true">${forwardToPhone}</Dial></Response>`;
    }

    const call = await client.calls.create(callConfig);

    // Update call attempt tracking - increment count via RPC
    await supabase.rpc("increment_call_attempts", { phone_id: phoneId });
    
    // Update last called timestamp
    await supabase
      .from("lead_phones")
      .update({
        last_called_at: new Date().toISOString(),
      })
      .eq("id", phoneId);

    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Twilio call failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
