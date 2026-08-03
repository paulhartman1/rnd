import { NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  let to: unknown;
  let body: unknown;
  try {
    ({ to, body } = await request.json());
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

  const cleanedTo = to.trim();
  const trimmedBody = body.trim();

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