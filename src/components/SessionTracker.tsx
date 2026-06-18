"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackSession } from "@/lib/session-tracker";

export function SessionTracker() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    // Wait for auth state to be ready
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        setIsReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      // Track session once auth is confirmed
      trackSession();
    }
  }, [isReady]);

  // This component renders nothing
  return null;
}
