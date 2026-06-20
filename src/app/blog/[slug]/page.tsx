import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  author_name: string;
  published_at: string | null;
  featured_image_url: string | null;
  meta_description: string | null;
  tags: string[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, meta_description, excerpt")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) {
    return {
      title: "Post Not Found | Rush N Dush",
    };
  }

  return {
    title: `${post.title} | Rush N Dush Blog`,
    description: post.meta_description || post.excerpt || undefined,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !post) {
    notFound();
  }

  const blogPost = post as BlogPost;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/blog" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Blog
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Image */}
        {blogPost.featured_image_url && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={blogPost.featured_image_url}
              alt={blogPost.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Tags */}
        {blogPost.tags && blogPost.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {blogPost.tags.map((tag) => (
              <span
                key={tag}
                className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {blogPost.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-gray-600 mb-8 pb-8 border-b">
          <span className="font-medium">{blogPost.author_name}</span>
          {blogPost.published_at && (
            <>
              <span>•</span>
              <time dateTime={blogPost.published_at}>
                {new Date(blogPost.published_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          {blogPost.content.split("\n").map((paragraph, index) => {
            if (paragraph.trim() === "") return null;
            return (
              <p key={index} className="mb-4 text-gray-800 leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* CTA at bottom */}
        <div className="mt-12 p-8 bg-blue-50 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to Sell Your House Fast?
          </h2>
          <p className="text-gray-600 mb-6">
            Get a no-obligation cash offer today. No repairs, no fees, close on your timeline.
          </p>
          <Link
            href="/get-cash-offer"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Your Cash Offer
          </Link>
        </div>
      </article>
    </div>
  );
}
