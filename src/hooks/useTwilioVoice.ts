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
};

export function useTwilioVoice(options: UseTwilioVoiceOptions = {}) {
  const {
    autoInitialize = false,
    onCallConnected,
    onCallDisconnected,
    onError,
  } = options;

  const deviceRef = useRef<Device | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);

  const initializeDevice = useCallback(async () => {
    try {
      setCallStatus("initializing");
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

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
      const device = new Device(token, {
        logLevel: 0,
        edge: "ashburn",
      });
      
      deviceRef.current = device;

      device.on("registered", () => {
        setCallStatus("ready");
      });

      device.on("error", (error) => {
        setCallStatus("error");
        if (onError) onError(error);
      });

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
  }, [onError]);

  const makeCall = useCallback(
    async (params: { phoneNumber: string; phoneId?: string; queueItemId?: string }) => {
      try {
        let device = deviceRef.current;
        if (!device) {
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

        const call = await device.connect({ params: connectParams });
        setCurrentCall(call);

        call.on("accept", () => {
          setCallStatus("ringing");
        });

        call.on("connect", () => {
          setCallStatus("connected");
          if (onCallConnected) onCallConnected(call);
        });

        call.on("disconnect", () => {
          setCallStatus("disconnected");
          setCurrentCall(null);
          setIsMuted(false);
          if (onCallDisconnected) onCallDisconnected();
        });

        call.on("error", (error) => {
          setCallStatus("error");
          if (onError) onError(error);
        });

        return call;
      } catch (error) {
        setCallStatus("error");
        if (onError) onError(error as Error);
        throw error;
      }
    },
    [initializeDevice, onCallConnected, onCallDisconnected, onError]
  );

  const hangup = useCallback(() => {
    if (currentCall) {
      setCallStatus("disconnecting");
      currentCall.disconnect();
    }
  }, [currentCall]);

  const toggleMute = useCallback(() => {
    if (currentCall) {
      const newMutedState = !isMuted;
      currentCall.mute(newMutedState);
      setIsMuted(newMutedState);
    }
  }, [currentCall, isMuted]);

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
  }, [autoInitialize, initializeDevice, cleanup]);

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
