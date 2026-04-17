import { NextResponse } from "next/server";

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

function getVoiceResponseXml() {
  const forwardToPhone = process.env.TWILIO_FORWARD_TO_NUMBER ?? "";
  const normalized = normalizePhone(forwardToPhone);

  if (!normalized) {
    return "<Response><Say>We are unable to connect your call right now.</Say><Hangup/></Response>";
  }

  return `<Response><Dial answerOnBridge="true">${normalized}</Dial></Response>`;
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
  return xmlResponse(getVoiceResponseXml());
}

export async function POST() {
  return xmlResponse(getVoiceResponseXml());
}
