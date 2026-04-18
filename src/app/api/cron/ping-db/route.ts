import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  // Optional: Add a secret token to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const supabase = createAdminClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed" },
        { status: 500 }
      );
    }

    // Simple query to keep database active
    const { data, error } = await supabase
      .from("leads")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Database ping failed:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    console.log("Database pinged successfully at", new Date().toISOString());

    return NextResponse.json({
      success: true,
      message: "Database pinged successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Ping endpoint error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
