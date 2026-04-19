import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

export async function POST(request: Request) {
  try {
    // Check if PWA push notifications are enabled
    const featureEnabled = await isFeatureEnabled("pwa_push_notifications");
    if (!featureEnabled) {
      return NextResponse.json(
        { error: "PWA push notifications are not enabled" },
        { status: 403 }
      );
    }

    const subscription = await request.json();
    const userAgent = request.headers.get("user-agent") || "Unknown";

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Upsert the subscription (update if exists, insert if not)
    const { data, error } = await adminClient
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          user_agent: userAgent,
          is_active: true,
        },
        {
          onConflict: "endpoint",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Failed to save push subscription:", error);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, subscription: data });
  } catch (error) {
    console.error("Push subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Mark subscription as inactive instead of deleting
    const { error } = await adminClient
      .from("push_subscriptions")
      .update({ is_active: false })
      .eq("endpoint", endpoint);

    if (error) {
      console.error("Failed to deactivate push subscription:", error);
      return NextResponse.json(
        { error: "Failed to remove subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscription deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
