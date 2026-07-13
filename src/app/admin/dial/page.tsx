import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import DialClient from "./dial-client";

export default async function DialPage() {
  const quickDialEnabled = await isFeatureEnabled("quick_dial");
  
  console.log('[DialPage] Feature flag check:', {
    quickDialEnabled,
    timestamp: new Date().toISOString(),
  });
  
  // Temporarily bypassed for debugging
  // if (!quickDialEnabled) {
  //   console.log('[DialPage] Feature disabled, redirecting to /admin/leads');
  //   redirect("/admin/leads");
  // }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DialClient />;
}
