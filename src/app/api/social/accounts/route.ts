import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";

/**
 * GET - List all connected social media accounts for the authenticated user
 */
export async function GET() {
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

    // Fetch connected accounts
    const { data: accounts, error } = await supabase
      .from("social_accounts")
      .select("id, platform, account_type, platform_account_id, account_name, account_username, profile_picture_url, is_active, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch social accounts:", error);
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 500 }
      );
    }

    // Filter out Facebook accounts if feature is disabled
    const isFacebookEnabled = await isFeatureEnabled("facebook_integration", user.email ?? undefined);
    const filteredAccounts = isFacebookEnabled
      ? accounts || []
      : (accounts || []).filter(acc => acc.platform !== "facebook");

    return NextResponse.json({ accounts: filteredAccounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Social accounts fetch failed:", message);

    return NextResponse.json(
      {
        error: "Failed to fetch social accounts",
        message: process.env.NODE_ENV === "production" ? undefined : message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect a social media account
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("id");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

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

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("social_accounts")
      .update({ is_active: false })
      .eq("id", accountId)
      .eq("user_id", user.id); // Ensure user owns this account

    if (error) {
      console.error("Failed to disconnect account:", error);
      return NextResponse.json(
        { error: "Failed to disconnect account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Account deletion failed:", message);

    return NextResponse.json(
      {
        error: "Failed to disconnect account",
        message: process.env.NODE_ENV === "production" ? undefined : message,
      },
      { status: 500 }
    );
  }
}
