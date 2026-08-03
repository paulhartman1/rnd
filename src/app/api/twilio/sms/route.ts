import twilio from "twilio";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const adminClient = createAdminClient();

  if (!authToken || !adminClient) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    // Validate request actually came from Twilio
    const signature = request.headers.get("x-twilio-signature");
    const isValid = twilio.validateRequest(
      authToken,
      signature ?? "",
      request.url,
      params,
    );

    if (!isValid) {
      return new NextResponse("Invalid signature", { status: 403 });
    }

    const messageSid = params["MessageSid"] ?? null;
    const fromNumber = params["From"] ?? "";
    const toNumber = params["To"] ?? "";
    const body = params["Body"] ?? null;

    if (!fromNumber || !toNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Collect MMS media URLs from NumMedia
    const numMedia = parseInt(params["NumMedia"] ?? "0", 10) || 0;
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = params[`MediaUrl${i}`];
      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
      }
    }

    const { error } = await adminClient.from("sms_messages").insert({
      message_sid: messageSid,
      from_number: fromNumber,
      to_number: toNumber,
      body: body,
      num_media: numMedia,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      direction: "inbound",
      is_read: false,
    });

    if (error) {
      console.error("Failed to store SMS message:", error);
      return NextResponse.json(
        { error: "Failed to store SMS message" },
        { status: 500 },
      );
    }

    // Return empty TwiML response to acknowledge receipt
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      },
    );
  } catch (error) {
    console.error("SMS webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}