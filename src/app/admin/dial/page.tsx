import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import DialClient from "./dial-client";

export default async function DialPage() {
  const quickDialEnabled = await isFeatureEnabled("quick_dial");
  
  if (!quickDialEnabled) {
    redirect("/admin/leads");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DialClient />;
}
