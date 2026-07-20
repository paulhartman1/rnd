import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

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

async function findOrCreateLead(fromNumber: string) {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const normalized = normalizePhone(fromNumber);
  if (!normalized) return null;

  // Look up existing lead by phone number
  const { data: existingPhone } = await supabase
    .from("lead_phones")
    .select(`
      id,
      lead_id,
      phone_number,
      leads (
        id,
        full_name,
        status
      )
    `)
    .eq("phone_number", normalized)
    .maybeSingle();

  if (existingPhone?.leads) {
    console.log('[Incoming Call] Found existing lead:', existingPhone.leads);
    return {
      leadId: (existingPhone.leads as any).id,
      fullName: (existingPhone.leads as any).full_name,
      status: (existingPhone.leads as any).status
    };
  }

  // Lead not found - create a new one with "phone" source
  console.log('[Incoming Call] Creating new lead for:', normalized);

  // Use existing "phone" source
  const PHONE_SOURCE_ID = '5690349d-4e0a-40ed-bb39-63cbf96bcbf1';

  // Create minimal lead record
  const { data: newLead, error: leadError } = await supabase
    .from("leads")
    .insert({
      full_name: "Unknown Caller",
      phone: normalized,
      email: "",
      street_address: "",
      city: "",
      state: "",
      postal_code: "",
      listed_with_agent: null,
      property_type: null,
      repairs_needed: null,
      close_timeline: null,
      sell_reason: null,
      acceptable_offer: null,
      sms_consent: false,
      source_id: PHONE_SOURCE_ID,
      status: "new",
      owner_notes: "Auto-created from incoming call"
    })
    .select("id, full_name, status")
    .single();

  if (leadError || !newLead) {
    console.error('[Incoming Call] Failed to create lead:', leadError);
    return null;
  }

  // Add phone to lead_phones
  await supabase
    .from("lead_phones")
    .insert({
      lead_id: newLead.id,
      phone_number: normalized,
      is_primary: true,
      phone_type: "unknown",
      display_order: 0
    });

  console.log('[Incoming Call] Created new lead:', newLead);
  return {
    leadId: newLead.id,
    fullName: newLead.full_name,
    status: newLead.status
  };
}

function isWithinAvailability(
  availability: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]
): boolean {
  const now = new Date();
  // Convert to Mountain Time (Denver)
  const denverTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Denver" }));
  const currentDay = denverTime.getDay();
  const currentTime = denverTime.toTimeString().split(" ")[0].substring(0, 5); // HH:MM

  console.log('[Availability Check]', {
    currentDay,
    currentTime,
    denverTime: denverTime.toISOString(),
    availabilityWindows: availability
  });

  // Check if current day/time falls within any active availability window
  const isAvailable = availability.some((window) => {
    if (!window.is_active) {
      console.log(`[Window Skip] Not active:`, window);
      return false;
    }
    
    if (window.day_of_week !== currentDay) {
      console.log(`[Window Skip] Wrong day (need ${currentDay}, got ${window.day_of_week}):`, window);
      return false;
    }
    
    const startTime = window.start_time.substring(0, 5);
    const endTime = window.end_time.substring(0, 5);
    const inWindow = currentTime >= startTime && currentTime < endTime;
    
    console.log(`[Window Check] Day ${window.day_of_week}: ${startTime}-${endTime}, current: ${currentTime}, inWindow: ${inWindow}`);
    return inWindow;
  });

  console.log('[Availability Result]', isAvailable);
  return isAvailable;
}

async function getVoiceResponseXml(fromNumber?: string, digits?: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    return '<Response><Say>We are unable to connect your call right now.</Say><Hangup/></Response>';
  }

  // Get phone settings (most recent)
  const { data: settings } = await supabase
    .from("phone_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get phone availability windows
  const { data: availability } = await supabase
    .from("phone_availability")
    .select("*")
    .eq("is_active", true);

  // Use DB settings if available, otherwise fallback to env var
  const forwardToPhone = settings ? (settings.forward_to_number || "") : (process.env.TWILIO_FORWARD_TO_NUMBER || "");
  const isForwardingEnabled = settings?.is_forwarding_enabled ?? true;
  const voicemailMessage = settings?.voicemail_message ||
    "Thank you for calling Rush N Dush Logistics. We are unable to take your call at this time. Please leave a message after the beep.";
  const voicemailVoice = (settings as any)?.voicemail_voice || "Polly.Matthew";

  // Check if we're within availability hours
  const isAvailable = availability && availability.length > 0 
    ? isWithinAvailability(availability)
    : true; // If no availability set, assume always available

  // Find or create lead for incoming caller
  let callerName = "Unknown Caller";
  if (fromNumber) {
    const leadInfo = await findOrCreateLead(fromNumber);
    if (leadInfo) {
      callerName = leadInfo.fullName;
    }
  }

  console.log('[Voice Route]', {
    hasAvailability: availability?.length,
    isAvailable,
    isForwardingEnabled,
    willForward: isForwardingEnabled && isAvailable,
    fromNumber,
    callerName,
    digits
  });

  // If forwarding is disabled OR outside availability hours, send to voicemail
  if (!isForwardingEnabled || !isAvailable) {
    console.log('[Going to voicemail]', { isForwardingEnabled, isAvailable });
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voicemailVoice}">${voicemailMessage}</Say>
  <Record maxLength="180" transcribe="true" transcribeCallback="${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/twilio/voicemail"/>
  <Say voice="${voicemailVoice}">Thank you. Goodbye.</Say>
</Response>`;
  }

  // Forward the call with whisper screening
  const normalized = normalizePhone(forwardToPhone);

  if (!normalized) {
    return '<Response><Say>We are unable to connect your call right now.</Say><Hangup/></Response>';
  }

  // If digits=1, connect the call (agent accepted)
  if (digits === "1") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true">
    <Number>${normalized}</Number>
  </Dial>
</Response>`;
  }

  // Initial call - use Gather for whisper screening
  // timeout="20" means ring for ~20 seconds (about 4-5 rings) before going to action URL
  const whisperMessage = `Incoming call from ${callerName}, a lead from Rush N Dush. Press 1 to accept.`;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" timeout="20" action="${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/twilio/voice/no-answer">
    <Number url="${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/twilio/voice/whisper">${normalized}</Number>
  </Dial>
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('From') || undefined;
  const digits = searchParams.get('Digits') || undefined;
  
  const xml = await getVoiceResponseXml(from, digits);
  return xmlResponse(xml);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const from = formData.get('From')?.toString() || undefined;
  const digits = formData.get('Digits')?.toString() || undefined;
  
  const xml = await getVoiceResponseXml(from, digits);
  return xmlResponse(xml);
}
