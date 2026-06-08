import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    console.log('[Voice Client] Received request');
    const formData = await request.formData();
    const queueItemId = formData.get('queueItemId') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const phoneId = formData.get('phoneId') as string;
    console.log('[Voice Client] Queue Item ID:', queueItemId);
    console.log('[Voice Client] Phone Number:', phoneNumber);
    console.log('[Voice Client] Phone ID:', phoneId);

    if (!queueItemId) {
      // This is likely a device registration call from Twilio - return empty response
      console.log('[Voice Client] No queueItemId - likely device registration');
      const response = new VoiceResponse();
      response.say('Device ready.');
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      console.error('[Voice Client] Failed to create admin client');
      const response = new VoiceResponse();
      response.say('Server configuration error.');
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    console.log('[Voice Client] Querying database for queue item:', queueItemId);
    // Get queue item with lead information
    const { data: queueItem, error: queueError } = await supabase
      .from('dialer_queue')
      .select(`
        id,
        campaign_id,
        lead_id,
        status,
        assigned_user_id,
        leads (
          id,
          phone,
          full_name,
          email
        ),
        dialer_campaigns (
          id,
          name
        )
      `)
      .eq('id', queueItemId)
      .single();
    
    console.log('[Voice Client] Query result:', { queueItem, queueError });

    if (queueError || !queueItem) {
      console.error('Queue item not found:', queueError);
      const response = new VoiceResponse();
      response.say('An error occurred. Lead not found.');
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const lead = queueItem.leads as any;
    
    // Use the phone number passed from the dialer, or fall back to lead's primary phone
    const targetPhoneNumber = phoneNumber || lead?.phone;
    
    if (!targetPhoneNumber) {
      console.error('No phone number available to call');
      const response = new VoiceResponse();
      response.say('An error occurred. No phone number available.');
      response.hangup();
      
      // Update queue item status to failed
      await supabase
        .from('dialer_queue')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', queueItemId);
      
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Update queue item status to calling
    console.log('[Voice Client] Updating queue item status to calling');
    await supabase
      .from('dialer_queue')
      .update({ status: 'calling', updated_at: new Date().toISOString() })
      .eq('id', queueItemId);

    // Create TwiML response to dial the lead
    console.log('[Voice Client] Creating TwiML to dial:', targetPhoneNumber);
    const response = new VoiceResponse();
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    console.log('[Voice Client] Using caller ID:', twilioPhoneNumber);

    // Use absolute URL for action callback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.rushndush.com';
    const actionUrl = `${baseUrl}/api/twilio/call-status?queueItemId=${queueItemId}${phoneId ? `&phoneId=${phoneId}` : ''}`;
    console.log('[Voice Client] Action URL:', actionUrl);

    const dial = response.dial({
      callerId: twilioPhoneNumber,
      action: actionUrl,
      timeout: 30
    });
    
    dial.number(targetPhoneNumber);

    const twiml = response.toString();
    console.log('[Voice Client] Generated TwiML:', twiml);
    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error in voice-client endpoint:', error);
    const response = new VoiceResponse();
    response.say('An error occurred while processing your call.');
    response.hangup();
    return new NextResponse(response.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
