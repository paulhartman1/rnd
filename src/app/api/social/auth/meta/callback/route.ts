import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles OAuth callback from Meta
 * Exchanges authorization code for access token and stores connected accounts
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // User ID
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("Meta OAuth error:", { error, errorDescription });
      return NextResponse.redirect(
        `/admin/social/connect?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        "/admin/social/connect?error=Missing authorization code or state"
      );
    }

    const supabase = await createClient();

    // Verify user is authenticated and matches state
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== state) {
      return NextResponse.redirect(
        "/admin/social/connect?error=Authentication failed or session mismatch"
      );
    }

    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_META_REDIRECT_URI;

    if (!metaAppId || !metaAppSecret || !redirectUri) {
      console.error("Missing Meta configuration for token exchange");
      return NextResponse.redirect(
        "/admin/social/connect?error=Server configuration error"
      );
    }

    // Exchange authorization code for access token
    // Reference: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", metaAppId);
    tokenUrl.searchParams.set("client_secret", metaAppSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(
        `/admin/social/connect?error=${encodeURIComponent(tokenData.error?.message || "Token exchange failed")}`
      );
    }

    const { access_token, expires_in } = tokenData;

    // Get user's Facebook pages
    // Reference: https://developers.facebook.com/docs/graph-api/reference/user/accounts
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${access_token}&fields=id,name,access_token,instagram_business_account,picture`
    );
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || pagesData.error) {
      console.error("Failed to fetch pages:", pagesData);
      return NextResponse.redirect(
        `/admin/social/connect?error=${encodeURIComponent(pagesData.error?.message || "Failed to fetch pages")}`
      );
    }

    const pages = pagesData.data || [];
    const accountsToStore = [];

    // Process each Facebook page
    for (const page of pages) {
      // Store Facebook page
      accountsToStore.push({
        user_id: user.id,
        platform: "facebook",
        account_type: "page",
        platform_account_id: page.id,
        account_name: page.name,
        account_username: null,
        access_token: page.access_token, // Page-scoped token
        token_expires_at: null, // Page tokens don't expire
        profile_picture_url: page.picture?.data?.url || null,
        is_active: true,
      });

      // If page has Instagram Business Account, fetch and store it
      if (page.instagram_business_account?.id) {
        const igAccountId = page.instagram_business_account.id;
        
        // Fetch Instagram account details
        const igResponse = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}?access_token=${page.access_token}&fields=id,username,name,profile_picture_url`
        );
        const igData = await igResponse.json();

        if (igResponse.ok && !igData.error) {
          accountsToStore.push({
            user_id: user.id,
            platform: "instagram",
            account_type: "business_account",
            platform_account_id: igData.id,
            account_name: igData.name || igData.username,
            account_username: igData.username,
            access_token: page.access_token, // Use page token for Instagram
            token_expires_at: null,
            profile_picture_url: igData.profile_picture_url || null,
            is_active: true,
          });
        }
      }
    }

    if (accountsToStore.length === 0) {
      return NextResponse.redirect(
        "/admin/social/connect?error=No Facebook pages or Instagram accounts found. Please ensure you have a Facebook page with Instagram connected."
      );
    }

    // Store accounts in database (upsert to handle reconnections)
    const { error: insertError } = await supabase
      .from("social_accounts")
      .upsert(accountsToStore, {
        onConflict: "user_id,platform,platform_account_id",
      });

    if (insertError) {
      console.error("Failed to store social accounts:", insertError);
      return NextResponse.redirect(
        `/admin/social/connect?error=${encodeURIComponent("Failed to save accounts to database")}`
      );
    }

    // Success! Redirect to social dashboard
    return NextResponse.redirect(
      `/admin/social?success=Connected ${accountsToStore.length} account(s)`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Meta OAuth callback failed:", message);

    return NextResponse.redirect(
      `/admin/social/connect?error=${encodeURIComponent("Authentication failed. Please try again.")}`
    );
  }
}
