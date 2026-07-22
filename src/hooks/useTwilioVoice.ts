"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Device, Call } from "@twilio/voice-sdk";

type CallStatus = 
  | "idle"
  | "initializing"
  | "ready"
  | "connecting"
  | "ringing"
  | "connected"
  | "disconnecting"
  | "disconnected"
  | "error";

type UseTwilioVoiceOptions = {
  autoInitialize?: boolean;
  onCallConnected?: (call: Call) => void;
  onCallDisconnected?: () => void;
  onError?: (error: Error) => void;
  debug?: boolean;
};

export function useTwilioVoice(options: UseTwilioVoiceOptions = {}) {
  console.log('[TwilioVoice] Hook initialized with options:', options);
  const {
    autoInitialize = false,
    onCallConnected,
    onCallDisconnected,
    onError,
    debug = false,
  } = options;

  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log("[TwilioVoice]", ...args);
  }, [debug]);

  const deviceRef = useRef<Device | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);

  const initializeDevice = useCallback(async () => {
    try {
      log("Initializing device...");
      setCallStatus("initializing");
      
      // iOS Safari workaround: Create audio context and keep mic stream active
      // This ensures both incoming and outgoing audio work on iOS Safari
      if (typeof window !== 'undefined' && !audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        log("Audio context created");
      }
      
      // CRITICAL: Resume audio context from user gesture (we're in button click context)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        log("Audio context resumed - state:", audioContextRef.current.state);
      }
      
      // Request and KEEP microphone stream active for iOS Safari
      // Without an active local audio track, iOS won't play remote audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        micStreamRef.current = stream;
        log("Microphone permission granted and stream kept active for iOS");
      } catch (permError) {
        // Provide more specific error messages for permission issues
        const isDenied = permError instanceof Error && 
          (permError.name === 'NotAllowedError' || permError.name === 'PermissionDeniedError');
        
        if (isDenied) {
          throw new Error(
            "Microphone permission denied. Please allow microphone access in your browser settings to make calls."
          );
        }
        
        const isNotSupported = permError instanceof Error && permError.name === 'NotSupportedError';
        if (isNotSupported) {
          throw new Error(
            "Your browser doesn't support microphone access. Please use a modern browser like Chrome, Safari, or Firefox."
          );
        }
        
        // Re-throw other errors
        throw permError;
      }

      // Get access token
      const tokenResponse = await fetch("/api/dialer/token");
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Failed to get access token: ${tokenResponse.status}`);
      }
      
      const tokenData = await tokenResponse.json();
      const { token } = tokenData;
      
      if (!token || typeof token !== "string") {
        throw new Error("Invalid token received from server");
      }

      // Initialize Twilio Device
      log("Creating Twilio Device...");
      const device = new Device(token, {
        logLevel: debug ? 1 : 0,
        edge: "ashburn",
      });
      
      deviceRef.current = device;

      device.on("registered", () => {
        log("Device registered and ready");
        setCallStatus("ready");
      });

      device.on("error", (error) => {
        log("Device error:", error);
        setCallStatus("error");
        if (onError) onError(error);
      });

      log("Registering device...");
      await device.register();
      return device;
    } catch (error) {
      let errorMessage = "Unknown error during device initialization";
      if (error === undefined || error === null) {
        errorMessage = "Device initialization failed";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        errorMessage = String(error);
      }
      
      setCallStatus("error");
      const errorObj = new Error(errorMessage);
      if (onError) onError(errorObj);
      throw errorObj;
    }
  }, [debug, log, onError]);

  const makeCall = useCallback(
    async (params: { phoneNumber: string; phoneId?: string; queueItemId?: string }) => {
      try {
        console.log("[TwilioVoice] makeCall invoked", params);
        log("Making call to:", params.phoneNumber);
        let device = deviceRef.current;
        if (!device) {
          console.log("[TwilioVoice] Device not initialized, initializing now...");
          device = await initializeDevice();
        }

        setCallStatus("connecting");

        // Connect with parameters
        const connectParams: Record<string, string> = {
          phoneNumber: params.phoneNumber,
        };

        if (params.phoneId) {
          connectParams.phoneId = params.phoneId;
        }

        if (params.queueItemId) {
          connectParams.queueItemId = params.queueItemId;
        }

        console.log('[TwilioVoice] Calling device.connect with params:', connectParams);
        const call = await device.connect({ params: connectParams });
        console.log('[TwilioVoice] Call object created:', call);
        setCurrentCall(call);

        call.on("accept", () => {
          console.log('[TwilioVoice] Event: accept (ringing)');
          log("Call accepted (ringing)");
          setCallStatus("ringing");
        });

        call.on("connect", () => {
          console.log('[TwilioVoice] Event: connect');
          log("Call connected");
          setCallStatus("connected");
          if (onCallConnected) onCallConnected(call);
        });

        call.on("disconnect", () => {
          console.log('[TwilioVoice] Event: disconnect');
          log("Call disconnected");
          
          // iOS Safari: Fully reset audio session
          // Stop mic stream
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
            log("Mic stream stopped after call disconnect");
          }
          
          // Close and clear AudioContext to force iOS to release audio session
          if (audioContextRef.current) {
            try {
              audioContextRef.current.close();
              log("AudioContext closed after call disconnect");
            } catch (error) {
              log("Error closing AudioContext:", error);
            }
            audioContextRef.current = null;
          }
          
          setCallStatus("disconnected");
          setCurrentCall(null);
          setIsMuted(false);
          if (onCallDisconnected) onCallDisconnected();
        });

        call.on("error", (error) => {
          console.log('[TwilioVoice] Event: error', error);
          log("Call error:", error);
          
          // iOS Safari: Clean up on error too
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
          }
          if (audioContextRef.current) {
            try {
              audioContextRef.current.close();
            } catch (err) {
              // Ignore
            }
            audioContextRef.current = null;
          }
          
          setCallStatus("error");
          if (onError) onError(error);
        });

        call.on("cancel", () => {
          console.log('[TwilioVoice] Event: cancel');
        });

        call.on("reject", () => {
          console.log('[TwilioVoice] Event: reject');
        });

        call.on("reconnecting", (error) => {
          console.log('[TwilioVoice] Event: reconnecting', error);
        });

        call.on("reconnected", () => {
          console.log('[TwilioVoice] Event: reconnected');
        });

        return call;
      } catch (error) {
        setCallStatus("error");
        if (onError) onError(error as Error);
        throw error;
      }
    },
    [initializeDevice, log, onCallConnected, onCallDisconnected, onError]
  );

  const hangup = useCallback(() => {
    if (currentCall) {
      log("Hanging up call");
      setCallStatus("disconnecting");
      currentCall.disconnect();
    }
  }, [currentCall, log]);

  const toggleMute = useCallback(() => {
    if (currentCall) {
      const newMutedState = !isMuted;
      currentCall.mute(newMutedState);
      setIsMuted(newMutedState);
      log(newMutedState ? "Call muted" : "Call unmuted");
    }
  }, [currentCall, isMuted, log]);

  const cleanup = useCallback(() => {
    if (deviceRef.current) {
      try {
        if (deviceRef.current.state === "registered") {
          deviceRef.current.unregister();
        }
        deviceRef.current.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
      deviceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (error) {
        // Ignore cleanup errors
      }
      audioContextRef.current = null;
    }
    setCurrentCall(null);
    setCallStatus("idle");
    setIsMuted(false);
  }, []);

  // Auto-initialize on mount if requested
  useEffect(() => {
    if (autoInitialize) {
      initializeDevice();
    }

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInitialize]);

  return {
    // State
    callStatus,
    currentCall,
    isMuted,
    isReady: callStatus === "ready",
    isConnected: callStatus === "connected",
    isRinging: callStatus === "ringing",
    
    // Actions
    initializeDevice,
    makeCall,
    hangup,
    toggleMute,
    cleanup,
  };
}
