"use client";

import { useCallback, useEffect, useState } from 'react';
import { usePhoneBridge } from '@/hooks/usePhoneBridge';
import { useTwilioVoice } from '@/hooks/useTwilioVoice';

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
  debug?: boolean;
} = {}) {
  const [usePhoneTransport, setUsePhoneTransport] = useState(false);

  const browserCalling = useTwilioVoice({
    debug: options.debug,
    onCallConnected: options.onCallConnected,
    onCallDisconnected: options.onCallDisconnected,
    onError: options.onError,
  });

  const phoneCalling = usePhoneBridge();

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isIOSDevice =
      /iPhone|iPad|iPod/.test(userAgent) ||
      (userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
    const isStandalonePWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    setUsePhoneTransport(isIOSDevice || (isStandalonePWA && /Mobile|Android/.test(userAgent)));
  }, []);

  const callStatus = usePhoneTransport
    ? phoneCalling.callStatus === 'calling_agent'
      ? 'connecting'
      : phoneCalling.callStatus === 'ringing_lead'
        ? 'ringing'
        : phoneCalling.callStatus
    : browserCalling.callStatus;

  const isConnected = usePhoneTransport
    ? phoneCalling.callStatus === 'ringing_lead' || phoneCalling.callStatus === 'connected'
    : browserCalling.isConnected;

  const isRinging = usePhoneTransport
    ? phoneCalling.callStatus === 'calling_agent' || phoneCalling.callStatus === 'ringing_lead'
    : browserCalling.isRinging;

  const error = usePhoneTransport ? phoneCalling.error : null;
  const transport = usePhoneTransport ? 'phone' : 'browser';

  const makeCall = useCallback(async (params: CallParams) => {
    if (usePhoneTransport) {
      console.log('[Unified Calling] Using phone bridge');
      await phoneCalling.makeCall(params);
      return;
    }

    console.log('[Unified Calling] Using WebRTC');
    await browserCalling.makeCall(params);
  }, [browserCalling, phoneCalling, usePhoneTransport]);

  const hangup = useCallback(() => {
    if (usePhoneTransport) {
      phoneCalling.hangup();
      return;
    }
    browserCalling.hangup();
  }, [browserCalling, phoneCalling, usePhoneTransport]);

  const toggleMute = useCallback(() => {
    if (usePhoneTransport) {
      phoneCalling.toggleMute();
      return;
    }
    browserCalling.toggleMute();
  }, [browserCalling, phoneCalling, usePhoneTransport]);

  return {
    callStatus,
    makeCall,
    hangup,
    toggleMute,
    isMuted: usePhoneTransport ? phoneCalling.isMuted : browserCalling.isMuted,
    error,
    transport,
    isIOS: usePhoneTransport,
    currentCallSid: usePhoneTransport ? phoneCalling.currentCall?.callSid ?? null : null,
    isConnected,
    isRinging,
  };
}
