import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Review, ReviewInsert } from "@/lib/reviews";

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed" },
        { status: 500 }
      );
    }

    // Fetch all reviews including soft-deleted ones
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
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

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed" },
        { status: 500 }
      );
    }

    const body = await request.json() as ReviewInsert;

    // Validate required fields
    if (!body.quote || !body.author || !body.role || body.display_order === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: quote, author, role, display_order" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        quote: body.quote,
        author: body.author,
        role: body.role,
        is_active: body.is_active ?? true,
        display_order: body.display_order,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create review:", error);
      return NextResponse.json(
        { error: "Failed to create review" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review: data as Review }, { status: 201 });
  } catch (error) {
    console.error("Reviews POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
