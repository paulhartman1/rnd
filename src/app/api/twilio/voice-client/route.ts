import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const queueItemId = formData.get('queueItemId') as string;

    if (!queueItemId) {
      console.error('Missing queueItemId parameter');
      const response = new VoiceResponse();
      response.say('An error occurred. Missing queue item ID.');
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      const response = new VoiceResponse();
      response.say('Server configuration error.');
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

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
          name,
          email
        ),
        dialer_campaigns (
          id,
          name
        )
      `)
      .eq('id', queueItemId)
      .single();

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
    await supabase
      .from('dialer_queue')
      .update({ status: 'calling', updated_at: new Date().toISOString() })
      .eq('id', queueItemId);

    // Create TwiML response to dial the lead
    const response = new VoiceResponse();
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    const dial = response.dial({
      callerId: twilioPhoneNumber,
      action: `/api/twilio/call-status?queueItemId=${queueItemId}`,
      timeout: 30
    });
    
    dial.number(lead.phone);

    return new NextResponse(response.toString(), {
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
