import AdminNav from "../../admin-nav";
import BlogPostForm from "../blog-post-form";

export default function NewBlogPostPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="container mx-auto max-w-4xl px-4 pt-4 pb-12">
        <AdminNav />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-navy)]">New Blog Post</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Create a new article for your blog
          </p>
        </div>

        <div className="rounded-xl border border-black/[0.08] bg-white shadow-sm p-8">
          <BlogPostForm />
        </div>
      </div>
    </div>
  );
}
