import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Review, ReviewUpdate } from "@/lib/reviews";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Failed to fetch review:", error);
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ review: data as Review });
  } catch (error) {
    console.error("Review GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json() as ReviewUpdate;

    const { data, error } = await supabase
      .from("reviews")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update review:", error);
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review: data as Review });
  } catch (error) {
    console.error("Review PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from("reviews")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Failed to delete review:", error);
      return NextResponse.json(
        { error: "Failed to delete review" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
