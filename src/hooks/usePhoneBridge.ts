"use client";

import { useState, useCallback } from 'react';

type CallStatus = 
  | 'idle'
  | 'calling_agent'
  | 'ringing_lead'
  | 'connected'
  | 'disconnected'
  | 'error';

type PhoneBridgeCall = {
  callSid: string;
  status: CallStatus;
};

export function usePhoneBridge() {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentCall, setCurrentCall] = useState<PhoneBridgeCall | null>(null);
  const [error, setError] = useState<string | null>(null);

  const makeCall = useCallback(async (params: {
    phoneNumber: string;
    queueItemId?: string;
    phoneId?: string;
  }) => {
    try {
      console.log('[Phone Bridge] Initiating call:', params);
      setCallStatus('calling_agent');
      setError(null);

      const response = await fetch('/api/calling/phone-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate call');
      }

      const { callSid } = await response.json();
      console.log('[Phone Bridge] Call initiated:', callSid);

      setCurrentCall({ callSid, status: 'calling_agent' });
      
      // Simple status: Agent ringing → Connected
      // We can't track detailed bridge status from browser, but that's OK
      // The call happens on the phone, status updates happen server-side
      setTimeout(() => {
        setCallStatus('ringing_lead');
      }, 3000);

    } catch (err) {
      console.error('[Phone Bridge] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate call';
      setError(errorMessage);
      setCallStatus('error');
      setCurrentCall(null);
      throw new Error(errorMessage);
    }
  }, []);

  const hangup = useCallback(() => {
    // User hangs up from their phone
    setCallStatus('idle');
    setCurrentCall(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setCallStatus('idle');
    setCurrentCall(null);
    setError(null);
  }, []);

  return {
    callStatus,
    currentCall,
    error,
    makeCall,
    hangup,
    reset,
    isPhoneBridge: true,
    // Stub methods for compatibility with WebRTC interface
    toggleMute: () => console.log('[Phone Bridge] Use your phone to mute'),
    isMuted: false,
  };
}
