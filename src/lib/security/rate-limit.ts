import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Get the client IP address from request headers
 * Supports Vercel and common proxy headers
 */
export function getClientIp(request: Request): string {
  // Vercel-specific header (most reliable)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Generic reverse proxy
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp;
  }

  return "unknown";
}

/**
 * Check rate limit using Supabase to count recent submissions
 * @param identifier - IP address or other identifier
 * @param limitCount - Max submissions allowed
 * @param windowMinutes - Time window in minutes
 */
export async function checkRateLimit(
  identifier: string,
  limitCount: number = 5,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    // Calculate timestamp for the start of the window
    const windowStart = new Date(
      Date.now() - windowMinutes * 60 * 1000
    ).toISOString();

    // Count recent submissions from this IP
    const { count, error } = await supabase
      .from("lead_submissions")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", identifier)
      .gte("created_at", windowStart);

    if (error) {
      console.error("Rate limit check error:", error);
      // On error, fail open (allow the request) but log the error
      return { allowed: true, remaining: limitCount };
    }

    const currentCount = count ?? 0;
    const remaining = Math.max(0, limitCount - currentCount);
    const allowed = currentCount < limitCount;

    return { allowed, remaining };
  } catch (error) {
    console.error("Rate limit check exception:", error);
    // On exception, fail open (allow the request)
    return { allowed: true, remaining: limitCount };
  }
}

/**
 * Log a lead submission attempt
 * @param params - Submission details
 */
export async function logLeadSubmission(params: {
  sourceId: string | null;
  ipAddress: string;
  userAgent: string | null;
  email?: string;
  phone?: string;
  accepted: boolean;
  rejectionReason?: string;
}): Promise<void> {
  try {
    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    const { error } = await supabase.from("lead_submissions").insert({
      source_id: params.sourceId,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      email: params.email,
      phone: params.phone,
      accepted: params.accepted,
      rejection_reason: params.rejectionReason,
    });

    if (error) {
      console.error("Failed to log lead submission:", error);
      // Don't throw - logging failures shouldn't break the request
    }
  } catch (error) {
    console.error("Exception logging lead submission:", error);
    // Don't throw - logging failures shouldn't break the request
  }
}
