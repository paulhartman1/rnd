import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    
    const fromNumber = formData.get("From") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;
    const transcriptionText = formData.get("TranscriptionText") as string || null;
    const transcriptionStatus = formData.get("TranscriptionStatus") as string || null;

    // Store voicemail in database
    const { error } = await supabase.from("voicemails").insert({
      from_number: fromNumber,
      recording_url: recordingUrl,
      recording_duration: recordingDuration ? parseInt(recordingDuration) : null,
      transcription: transcriptionText,
      transcription_status: transcriptionStatus,
      is_read: false,
    });

    if (error) {
      console.error("Failed to store voicemail:", error);
      return NextResponse.json({ error: "Failed to store voicemail" }, { status: 500 });
    }

    // Return empty TwiML response
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("Voicemail callback error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
