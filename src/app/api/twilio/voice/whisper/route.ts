import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Twilio Whisper webhook
 * Plays a message to the agent before connecting the call
 */

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
  const from = searchParams.get('From') || 'Unknown Number';
  
  // Extract lead name from parent call if available
  // For now, just announce the number
  const whisperMessage = `Incoming call from Rush N Dush dot com. Press 1 to accept.`;
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" timeout="5" action="${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/twilio/voice/whisper/accept">
    <Say voice="Polly.Matthew">${whisperMessage}</Say>
  </Gather>
  <Say voice="Polly.Matthew">No input received. Connecting call.</Say>
</Response>`;
  
  return xmlResponse(xml);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
