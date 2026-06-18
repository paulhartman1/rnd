import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/create-password";

  console.log("[Auth Callback] Code:", code ? "present" : "missing");

  if (code) {
    // PKCE flow - exchange code for session
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("[Auth Callback] Error exchanging code:", error);
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, request.url)
      );
    }
    
    console.log("[Auth Callback] Session established:", !!data.session);
    return NextResponse.redirect(new URL(next, request.url));
  }

  // If no code, this might be an implicit flow (hash fragment)
  // Redirect to the create-password page which will handle the hash fragment
  console.log("[Auth Callback] No code, redirecting to create-password");
  return NextResponse.redirect(new URL("/auth/create-password", request.url));
}
