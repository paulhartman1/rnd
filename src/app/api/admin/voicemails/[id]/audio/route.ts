import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const adminClient = createAdminClient();
  const supabase = adminClient ?? (await createClient());

  // Get the voicemail
  const { data: voicemail, error } = await supabase
    .from("voicemails")
    .select("recording_url")
    .eq("id", id)
    .single();

  if (error || !voicemail?.recording_url) {
    return NextResponse.json(
      { error: "Voicemail not found" },
      { status: 404 }
    );
  }

  // Get Twilio credentials
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
    // Fetch the recording from Twilio with authentication
    const auth = apiKeySid && apiKeySecret
      ? Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')
      : Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(voicemail.recording_url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch recording from Twilio");
    }

    // Stream the audio to the client
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to fetch recording:", error);
    return NextResponse.json(
      { error: "Failed to fetch recording" },
      { status: 500 }
    );
  }
}
