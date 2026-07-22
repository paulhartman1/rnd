import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, queueItemId, phoneId } = await request.json();
    
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent's phone from phone_settings
    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const { data: settings } = await adminSupabase
      .from('phone_settings')
      .select('forward_to_number')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const agentPhone = settings?.forward_to_number;
    if (!agentPhone) {
      return NextResponse.json(
        { error: 'No agent phone configured in settings' },
        { status: 400 }
      );
    }

    // Validate Twilio config
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!accountSid || !authToken || !twilioPhone) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);

    // Create call: Ring agent, then immediately bridge to lead
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Connecting to lead</Say>
  <Dial 
    callerId="${twilioPhone}" 
    record="record-from-answer-dual"
    recordingStatusCallback="${baseUrl}/api/twilio/recording-complete?queueItemId=${queueItemId}&phoneId=${phoneId || ''}"
    action="${baseUrl}/api/twilio/call-status?queueItemId=${queueItemId}&phoneId=${phoneId || ''}&transport=phone">
    <Number>${phoneNumber}</Number>
  </Dial>
</Response>`;

    console.log('[Phone Bridge] Initiating call:', {
      to: agentPhone,
      from: twilioPhone,
      queueItemId,
      leadPhone: phoneNumber
    });

    const call = await client.calls.create({
      to: agentPhone,
      from: twilioPhone,
      twiml,
      statusCallback: `${baseUrl}/api/twilio/call-status?queueItemId=${queueItemId}&phoneId=${phoneId || ''}&transport=phone`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    console.log('[Phone Bridge] Call created:', call.sid);

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      transport: 'phone'
    });

  } catch (error) {
    console.error('[Phone Bridge] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
