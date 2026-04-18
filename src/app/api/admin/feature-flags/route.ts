import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin, type FeatureFlag } from "@/lib/feature-flags";

/**
 * GET - Fetch all feature flags (super admins only)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Check if user is a super admin
    if (!isSuperAdmin(user.email)) {
      return NextResponse.json(
        { error: "Access denied. Feature flags are only accessible to super admins." },
        { status: 403 }
      );
    }

    const { data: flags, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("flag_name", { ascending: true });

    if (error) {
      console.error("Failed to fetch feature flags:", error);
      return NextResponse.json(
        { error: "Failed to fetch feature flags" },
        { status: 500 }
      );
    }

    return NextResponse.json({ flags: flags as FeatureFlag[] });
  } catch (error) {
    console.error("Feature flags GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a feature flag (super admins only)
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Check if user is a super admin
    if (!isSuperAdmin(user.email)) {
      return NextResponse.json(
        { error: "Access denied. Feature flags are only accessible to super admins." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, is_enabled } = body;

    if (!id || typeof is_enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request. Must provide id and is_enabled." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("feature_flags")
      .update({ is_enabled })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update feature flag:", error);
      return NextResponse.json(
        { error: "Failed to update feature flag" },
        { status: 500 }
      );
    }

    return NextResponse.json({ flag: data as FeatureFlag });
  } catch (error) {
    console.error("Feature flags PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
