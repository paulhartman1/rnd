import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    console.log('[Voice Client] Received request');
    const formData = await request.formData();
    const queueItemId = formData.get('queueItemId') as string;
    console.log('[Voice Client] Queue Item ID:', queueItemId);

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
    if (!lead?.phone) {
      console.error('Lead has no phone number');
      const response = new VoiceResponse();
      response.say('An error occurred. Lead has no phone number.');
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
    console.log('[Voice Client] Creating TwiML to dial:', lead.phone);
    const response = new VoiceResponse();
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    console.log('[Voice Client] Using caller ID:', twilioPhoneNumber);

    const dial = response.dial({
      callerId: twilioPhoneNumber,
      action: `/api/twilio/call-status?queueItemId=${queueItemId}`,
      timeout: 30
    });
    
    dial.number(lead.phone);

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
