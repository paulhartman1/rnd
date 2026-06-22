import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      title,
      slug,
      content,
      excerpt,
      author_name,
      published,
      published_at,
      featured_image_url,
      meta_description,
      tags,
    } = body;

    // Validate required fields
    if (!title || !slug || !content || !author_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert blog post
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        content,
        excerpt: excerpt || null,
        author_id: user.id,
        author_name,
        published: published || false,
        published_at: published ? published_at || new Date().toISOString() : null,
        featured_image_url: featured_image_url || null,
        meta_description: meta_description || null,
        tags: tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating blog post:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create blog post" },
        { status: 500 }
      );
    }

    // If featured_image_url is provided, update blog_images to link to this post
    if (featured_image_url && data?.id) {
      await supabase
        .from("blog_images")
        .update({ blog_post_id: data.id })
        .eq("url", featured_image_url)
        .is("blog_post_id", null);
    }

    return NextResponse.json({ success: true, post: data });
  } catch (error) {
    console.error("Error in POST /api/admin/blog:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
