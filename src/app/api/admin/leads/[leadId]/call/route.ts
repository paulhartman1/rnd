import { NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@/lib/supabase/server";

type Params = {
  leadId: string;
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
  { params }: { params: Promise<Params> },
) {
  const { leadId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("full_name, phone")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const toPhone = normalizePhone(lead.phone);
  if (!toPhone) {
    return NextResponse.json(
      { error: "Lead phone number is invalid for outbound calling." },
      { status: 400 },
    );
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const fromPhone = process.env.TWILIO_PHONE_NUMBER ?? "";
  const forwardToPhone = process.env.TWILIO_FORWARD_TO_NUMBER ?? "";
  const twilioCallUrl = process.env.TWILIO_CALL_URL ?? "";

  if (!accountSid || !authToken || !fromPhone) {
    return NextResponse.json(
      {
        error:
          "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
      },
      { status: 500 },
    );
  }

  if (!twilioCallUrl && !forwardToPhone) {
    return NextResponse.json(
      {
        error:
          "Missing call target. Set TWILIO_FORWARD_TO_NUMBER for live bridged calls, or TWILIO_CALL_URL for custom TwiML.",
      },
      { status: 500 },
    );
  }

  try {
    const client = twilio(accountSid, authToken);
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

    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Twilio call failed.";
    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}
