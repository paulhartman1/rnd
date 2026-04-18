import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/reviews";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch reviews:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reviews: data as Review[] });
  } catch (error) {
    console.error("Reviews API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
