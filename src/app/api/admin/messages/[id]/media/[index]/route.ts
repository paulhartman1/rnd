import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string; index: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id, index } = await context.params;

  const adminClient = createAdminClient();
  const supabase = adminClient ?? (await createClient());

  const { data: message, error } = await supabase
    .from("sms_messages")
    .select("media_urls")
    .eq("id", id)
    .single();

  if (error || !message?.media_urls?.length) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const mediaIndex = parseInt(index, 10);
  const mediaUrl = message.media_urls[mediaIndex];

  if (!mediaUrl) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || (!apiKeySid && !authToken)) {
    return NextResponse.json(
      { error: "Twilio not configured" },
      { status: 500 }
    );
  }

  try {
    const auth =
      apiKeySid && apiKeySecret
        ? Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64")
        : Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch media from Twilio");
    }

    const mediaBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(mediaBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": mediaBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to fetch media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}