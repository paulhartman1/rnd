import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import twilio from 'twilio';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to autodialer feature
    console.log('[Token] Checking feature access for user:', user.id, user.email);
    const hasAccess = await isFeatureEnabled('autodialer', user.email);
    console.log('[Token] Feature access result:', hasAccess);

    if (!hasAccess) {
      console.error('[Token] Access denied for user:', user.email);
      return NextResponse.json(
        { error: 'Access denied. User does not have autodialer feature access.' },
        { status: 403 }
      );
    }

    // Generate access token
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY_SID;
    const apiSecret = process.env.TWILIO_API_KEY_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      console.error('Missing Twilio Voice SDK environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create access token with user's ID as identity
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: user.id,
      ttl: 3600 // Token expires in 1 hour
    });

    // Add voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true
    });

    token.addGrant(voiceGrant);

    return NextResponse.json({
      token: token.toJwt(),
      identity: user.id
    });

  } catch (error) {
    console.error('Error generating access token:', error);
    return NextResponse.json(
      { error: 'Failed to generate access token' },
      { status: 500 }
    );
  }
}
