import { NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Remove leading 1 (US country code) if 11 digits
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Require an authenticated admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // Outbound SMS is gated behind the Twilio A2P campaign approval.
  if (process.env.TWILIO_SMS_OUTBOUND_ENABLED !== "true") {
    return NextResponse.json(
      {
        error:
          "Outbound SMS is disabled until the Twilio A2P campaign is approved.",
      },
      { status: 423 }
    );
  }

  let to: unknown;
  let body: unknown;
  let leadId: unknown;
  try {
    ({ to, body, leadId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (
    typeof to !== "string" ||
    typeof body !== "string" ||
    !to.trim() ||
    !body.trim()
  ) {
    return NextResponse.json(
      { error: "to and body are required" },
      { status: 400 }
    );
  }

  const cleanedTo = to.trim();
  const trimmedBody = body.trim();

  // Compliance checks
  // 1. Check if number has opted out
  const { data: optedOut } = await adminClient
    .from("sms_opt_outs")
    .select("id")
    .eq("phone_number", cleanedTo)
    .single();

  if (optedOut) {
    return NextResponse.json(
      { error: "This number has opted out of SMS messages" },
      { status: 403 }
    );
  }

  // 2. Check for inbound conversation OR explicit consent
  // If leadId provided, check consent + all lead phones, then inbound messages
  // Otherwise, check any inbound message from this number
  let allowed = false;
  if (typeof leadId === "string" && leadId) {
    // Fetch lead consent flag and primary phone
    const { data: lead } = await adminClient
      .from("leads")
      .select("sms_consent, phone")
      .eq("id", leadId)
      .single();

    // Fetch all lead phones
    const { data: leadPhones } = await adminClient
      .from("lead_phones")
      .select("phone_number")
      .eq("lead_id", leadId);

    // Build normalized set of ALL lead phone numbers
    const allLeadPhones = new Set<string>();
    if (lead?.phone) allLeadPhones.add(normalizePhone(lead.phone));
    if (leadPhones) {
      for (const p of leadPhones) {
        allLeadPhones.add(normalizePhone(p.phone_number));
      }
    }

    // Check if "to" number matches ANY lead phone AND lead has consent
    const normalizedTo = normalizePhone(cleanedTo);
    const consentMatch = lead?.sms_consent === true && allLeadPhones.has(normalizedTo);

    if (consentMatch) {
      allowed = true;
    } else {
      // Fall back to inbound conversation check
      if (leadPhones && leadPhones.length > 0) {
        const phoneNumbers = leadPhones.map((p) => p.phone_number);
        const { data: inbound } = await adminClient
          .from("sms_messages")
          .select("id")
          .in("from_number", phoneNumbers)
          .eq("direction", "inbound")
          .is("deleted_at", null)
          .limit(1);
        allowed = !!inbound && inbound.length > 0;
      }
    }
  } else {
    // Fallback: check any inbound from this number
    const { data: inbound } = await adminClient
      .from("sms_messages")
      .select("id")
      .eq("from_number", cleanedTo)
      .eq("direction", "inbound")
      .is("deleted_at", null)
      .limit(1);
    allowed = !!inbound && inbound.length > 0;
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "SMS only allowed to numbers that have texted in first or have given consent" },
      { status: 403 }
    );
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const apiKeySid = process.env.TWILIO_API_KEY_SID ?? "";
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const fromPhone = process.env.TWILIO_PHONE_NUMBER ?? "";

  if (!accountSid || (!apiKeySid && !authToken) || !fromPhone) {
    return NextResponse.json(
      {
        error:
          "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET (or TWILIO_AUTH_TOKEN), and TWILIO_PHONE_NUMBER.",
      },
      { status: 500 }
    );
  }

  try {
    const client =
      apiKeySid && apiKeySecret
        ? twilio(apiKeySid, apiKeySecret, { accountSid })
        : twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: trimmedBody,
      from: fromPhone,
      to: cleanedTo,
    });

    // Record the outbound message so it appears in the conversation
    const { error: insertError } = await adminClient
      .from("sms_messages")
      .insert({
        message_sid: message.sid ?? null,
        from_number: fromPhone,
        to_number: cleanedTo,
        body: trimmedBody,
        num_media: 0,
        media_urls: null,
        direction: "outbound",
        is_read: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store outbound SMS:", insertError);
      return NextResponse.json({
        success: true,
        stored: false,
        messageSid: message.sid,
      });
    }

    return NextResponse.json({
      success: true,
      stored: true,
      messageSid: message.sid,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Twilio SMS send failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}