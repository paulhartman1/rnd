import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Handles calls that weren't answered after ringing
 * Sends them to voicemail with settings from /admin/phone-settings
 */

function xmlResponse(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

export async function GET() {
  const supabase = createAdminClient();
  
  let settings = null;
  if (supabase) {
    // Get voicemail settings from phone_settings table
    const result = await supabase
      .from("phone_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    settings = result.data;
  }
  
  const voicemailMessage = settings?.voicemail_message ||
    "Thank you for calling Rush N Dush Logistics. We are unable to take your call at this time. Please leave a message after the beep.";
  const voicemailVoice = (settings as any)?.voicemail_voice || "Polly.Matthew";
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voicemailVoice}">${voicemailMessage}</Say>
  <Record maxLength="180" transcribe="true" transcribeCallback="${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/twilio/voicemail"/>
  <Say voice="${voicemailVoice}">Thank you. Goodbye.</Say>
</Response>`;
  
  return xmlResponse(xml);
}

export async function POST() {
  return GET();
}
