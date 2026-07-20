import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Handles agent's response to whisper screening
 * If they press 1, connect the call
 * Otherwise, send to voicemail or hang up
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
  const digits = searchParams.get('Digits');
  
  if (digits === "1") {
    // Agent accepted - just continue with the call
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
    return xmlResponse(xml);
  }
  
  // Agent did not press 1 or timeout - still connect the call
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
  
  return xmlResponse(xml);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
