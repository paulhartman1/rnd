import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AdminNav from "../../admin-nav";
import BlogPostForm from "../blog-post-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="container mx-auto max-w-4xl px-4 pt-4 pb-12">
        <AdminNav />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-navy)]">Edit Blog Post</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Update your blog article
          </p>
        </div>

        <div className="rounded-xl border border-black/[0.08] bg-white shadow-sm p-8">
          <BlogPostForm post={post} />
        </div>
      </div>
    </div>
  );
}
