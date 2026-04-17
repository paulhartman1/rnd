import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizePhone(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
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

function isWithinAvailability(
  availability: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]
): boolean {
  const now = new Date();
  // Convert to Mountain Time (Denver)
  const denverTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Denver" }));
  const currentDay = denverTime.getDay();
  const currentTime = denverTime.toTimeString().split(" ")[0].substring(0, 5); // HH:MM

  // Check if current day/time falls within any active availability window
  return availability.some((window) => {
    if (!window.is_active || window.day_of_week !== currentDay) return false;
    
    const startTime = window.start_time.substring(0, 5);
    const endTime = window.end_time.substring(0, 5);
    
    return currentTime >= startTime && currentTime <= endTime;
  });
}

async function getVoiceResponseXml() {
  const supabase = createAdminClient();

  if (!supabase) {
    return '<Response><Say>We are unable to connect your call right now.</Say><Hangup/></Response>';
  }

  // Get phone settings
  const { data: settings } = await supabase
    .from("phone_settings")
    .select("*")
    .limit(1)
    .single();

  // Get phone availability windows
  const { data: availability } = await supabase
    .from("phone_availability")
    .select("*")
    .eq("is_active", true);

  // Fallback to env var if no settings in DB
  const forwardToPhone = settings?.forward_to_number || process.env.TWILIO_FORWARD_TO_NUMBER || "";
  const isForwardingEnabled = settings?.is_forwarding_enabled ?? true;
  const voicemailMessage = settings?.voicemail_message ||
    "Thank you for calling Rush N Dush Logistics. We are unable to take your call at this time. Please leave a message after the beep.";

  // Check if we're within availability hours
  const isAvailable = availability && availability.length > 0 
    ? isWithinAvailability(availability)
    : true; // If no availability set, assume always available

  // If forwarding is disabled OR outside availability hours, send to voicemail
  if (!isForwardingEnabled || !isAvailable) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${voicemailMessage}</Say>
  <Record maxLength="180" transcribe="true" transcribeCallback="${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/twilio/voicemail"/>
  <Say voice="Polly.Matthew">Thank you. Goodbye.</Say>
</Response>`;
  }

  // Forward the call
  const normalized = normalizePhone(forwardToPhone);

  if (!normalized) {
    return '<Response><Say>We are unable to connect your call right now.</Say><Hangup/></Response>';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true">${normalized}</Dial>
</Response>`;
}

function xmlResponse(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

export async function GET() {
  const xml = await getVoiceResponseXml();
  return xmlResponse(xml);
}

export async function POST() {
  const xml = await getVoiceResponseXml();
  return xmlResponse(xml);
}
