import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Initiates OAuth flow with Meta (Facebook/Instagram)
 * Redirects user to Meta's authorization page
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const metaAppId = process.env.META_APP_ID;
    const redirectUri = process.env.NEXT_PUBLIC_META_REDIRECT_URI;

    if (!metaAppId || !redirectUri) {
      console.error("Missing Meta configuration:", {
        hasAppId: !!metaAppId,
        hasRedirectUri: !!redirectUri,
      });
      return NextResponse.json(
        { error: "Meta integration not configured. Please contact administrator." },
        { status: 500 }
      );
    }

    // Build Meta OAuth URL
    // Reference: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
    const scope = [
      "pages_show_list", // List pages user manages
      "pages_manage_posts", // Post to Facebook pages
      "business_management", // Access to business accounts
    ].join(",");

    const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authUrl.searchParams.set("client_id", metaAppId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", user.id); // Pass user ID as state for verification

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Meta OAuth initiation failed:", message);

    return NextResponse.json(
      {
        error: "Failed to initiate Meta authentication",
        message: process.env.NODE_ENV === "production" ? undefined : message,
      },
      { status: 500 }
    );
  }
}
