import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  const response = new VoiceResponse();
  
  // Simple test: just say something and hang up
  response.say('Hello! This is a test call from your Twilio Voice SDK. The endpoint is working correctly.');
  response.hangup();

  return new NextResponse(response.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}
