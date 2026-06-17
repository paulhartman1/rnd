"use client";

import { useEffect } from "react";
import { trackSession } from "@/lib/session-tracker";

export function SessionTracker() {
  useEffect(() => {
    // Track session on mount
    trackSession();
  }, []);

  // This component renders nothing
  return null;
}
