import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET() {
  try {
    // Check all required env vars
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY_SID;
    const apiSecret = process.env.TWILIO_API_KEY_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    const missing = [];
    if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
    if (!apiKey) missing.push('TWILIO_API_KEY_SID');
    if (!apiSecret) missing.push('TWILIO_API_KEY_SECRET');
    if (!twimlAppSid) missing.push('TWILIO_TWIML_APP_SID');
    if (!phoneNumber) missing.push('TWILIO_PHONE_NUMBER');

    if (missing.length > 0) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        missing
      }, { status: 500 });
    }

    // Try to create an access token
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: 'test-user',
      ttl: 3600
    });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true
    });

    token.addGrant(voiceGrant);
    const jwt = token.toJwt();

    return NextResponse.json({
      status: 'success',
      message: 'All Twilio Voice SDK environment variables are set correctly',
      config: {
        accountSid: accountSid.substring(0, 10) + '...',
        apiKeySid: apiKey.substring(0, 10) + '...',
        twimlAppSid: twimlAppSid.substring(0, 10) + '...',
        phoneNumber: phoneNumber
      },
      tokenGenerated: jwt.length > 0
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
