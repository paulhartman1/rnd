"use client";

const SESSION_PING_KEY = "session_ping_sent";

/**
 * Detects if the app is running as an installed PWA
 */
export function isPWAMode(): boolean {
  if (typeof window === "undefined") return false;

  // Check if running in standalone mode (iOS)
  const isStandalone = (window.navigator as any).standalone === true;

  // Check if running in standalone mode (Android/Chrome)
  const isStandaloneMode = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;

  return isStandalone || isStandaloneMode;
}

/**
 * Tracks a user session by sending activity data to the API
 * Only sends once per browser session to avoid duplicate counting
 */
export async function trackSession(): Promise<void> {
  if (typeof window === "undefined") return;

  // Check if we've already sent a ping this session
  const alreadySent = sessionStorage.getItem(SESSION_PING_KEY);
  if (alreadySent) {
    return;
  }

  const isPWA = isPWAMode();

  try {
    const response = await fetch("/api/activity/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isPWA }),
    });

    if (response.ok) {
      // Mark as sent for this session
      sessionStorage.setItem(SESSION_PING_KEY, "true");
    } else {
      console.warn("Session tracking failed:", await response.text());
    }
  } catch (error) {
    console.error("Session tracking error:", error);
    // Silently fail - don't interrupt user experience
  }
}
