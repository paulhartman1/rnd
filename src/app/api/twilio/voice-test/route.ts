import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

function generateTestTwiML() {
  const response = new VoiceResponse();
  
  // Simple test: just say something and hang up
  response.say('Hello! This is a test call from your Twilio Voice SDK. The endpoint is working correctly.');
  response.hangup();
  
  return response.toString();
}

export async function GET() {
  return new NextResponse(generateTestTwiML(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}

export async function POST(request: NextRequest) {
  return new NextResponse(generateTestTwiML(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}
