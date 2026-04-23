import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import twilio from 'twilio';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await isFeatureEnabled('autodialer', user.email);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY_SID;
    const apiSecret = process.env.TWILIO_API_KEY_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      return NextResponse.json({
        error: 'Missing environment variables',
        has: {
          accountSid: !!accountSid,
          apiKey: !!apiKey,
          apiSecret: !!apiSecret,
          twimlAppSid: !!twimlAppSid
        }
      }, { status: 500 });
    }

    // Create token
    const token = new AccessToken(
      accountSid as string,
      apiKey as string,
      apiSecret as string,
      {
        identity: user.id,
        ttl: 3600
      }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid as string,
      incomingAllow: true
    });

    token.addGrant(voiceGrant);
    const jwt = token.toJwt();

    // Decode token to verify structure (without validating signature)
    const parts = jwt.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return NextResponse.json({
      status: 'success',
      config: {
        accountSid: (accountSid as string).substring(0, 10) + '...',
        apiKeySid: (apiKey as string).substring(0, 10) + '...',
        twimlAppSid: (twimlAppSid as string).substring(0, 10) + '...',
      },
      tokenPayload: {
        iss: payload.iss,
        sub: payload.sub,
        grants: payload.grants,
        exp: payload.exp,
        expiresIn: payload.exp - Math.floor(Date.now() / 1000) + ' seconds'
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
