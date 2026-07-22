"use client";

import { useCallback, useEffect, useState } from 'react';

type CallStatus = 
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'connecting'
  | 'ringing'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error';

type CallParams = {
  phoneNumber: string;
  phoneId?: string;
  queueItemId?: string;
};

export function useUnifiedCalling(options: { 
  onCallConnected?: () => void;
  onCallDisconnected?: () => void;
  onError?: (error: Error) => void;
} = {}) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  
  // Detect iOS
  const isIOS = typeof navigator !== 'undefined' && 
    /iPhone|iPad|iPod/.test(navigator.userAgent);
  
  const transport = isIOS ? 'phone' : 'browser';

  const makeCall = useCallback(async (params: CallParams) => {
    try {
      setError(null);
      
      if (isIOS) {
        // Phone Bridge: Call agent's phone, then bridge to lead
        console.log('[Unified Calling] Using phone bridge for iOS');
        setCallStatus('connecting');
        
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
        setCurrentCallSid(callSid);
        setCallStatus('ringing');
        
        // Simulate progression for phone bridge
        setTimeout(() => {
          setCallStatus('connected');
          options.onCallConnected?.();
        }, 4000);

      } else {
        // Browser WebRTC: Use existing Twilio Voice SDK
        console.log('[Unified Calling] Using WebRTC for desktop');
        setCallStatus('connecting');
        
        // Import dynamically to avoid loading on iOS
        const { Device } = await import('@twilio/voice-sdk');
        
        // Get token
        const tokenResponse = await fetch('/api/dialer/token');
        if (!tokenResponse.ok) {
          throw new Error('Failed to get access token');
        }
        
        const { token } = await tokenResponse.json();
        
        // Initialize device
        const device = new Device(token, { logLevel: 0, edge: 'ashburn' });
        
        await device.register();
        setCallStatus('ready');
        
        // Make call
        const call = await device.connect({ params });
        setCurrentCallSid(call.parameters.CallSid);
        
        call.on('accept', () => {
          setCallStatus('ringing');
        });
        
        call.on('connect', () => {
          setCallStatus('connected');
          options.onCallConnected?.();
        });
        
        call.on('disconnect', () => {
          setCallStatus('disconnected');
          setCurrentCallSid(null);
          options.onCallDisconnected?.();
        });
        
        call.on('error', (err) => {
          setCallStatus('error');
          setError(err.message);
          options.onError?.(err);
        });
      }
      
    } catch (err) {
      console.error('[Unified Calling] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Call failed';
      setError(errorMessage);
      setCallStatus('error');
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [isIOS, options]);

  const hangup = useCallback(() => {
    if (isIOS) {
      // User hangs up from their phone
      setCallStatus('disconnected');
      setCurrentCallSid(null);
      options.onCallDisconnected?.();
    } else {
      // WebRTC hangup handled by call.disconnect()
      setCallStatus('disconnecting');
    }
  }, [isIOS, options]);

  const toggleMute = useCallback(() => {
    if (isIOS) {
      // User uses phone mute button
      console.log('[Unified Calling] Use phone mute button');
    } else {
      // WebRTC mute toggle
      setIsMuted(prev => !prev);
    }
  }, [isIOS]);

  return {
    callStatus,
    makeCall,
    hangup,
    toggleMute,
    isMuted,
    error,
    transport,
    isIOS,
    currentCallSid,
    isConnected: callStatus === 'connected',
    isRinging: callStatus === 'ringing',
  };
}
