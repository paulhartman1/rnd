import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Blog | Rush N Dush - Real Estate Tips & Market Insights",
  description: "Expert real estate advice, home selling tips, and market updates. Learn how to sell your house fast, maximize your home's value, and navigate the real estate market.",
  openGraph: {
    title: "Rush N Dush Blog - Real Estate Insights",
    description: "Expert real estate advice, home selling tips, and market updates.",
    url: "https://rushndu.sh/blog",
    siteName: "Rush N Dush",
    images: [
      {
        url: "https://rushndu.sh/og-blog.jpg",
        width: 1200,
        height: 630,
        alt: "Rush N Dush Blog",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rush N Dush Blog - Real Estate Insights",
    description: "Expert real estate advice, home selling tips, and market updates.",
    images: ["https://rushndu.sh/og-blog.jpg"],
  },
  alternates: {
    canonical: "https://rushndu.sh/blog",
  },
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  author_name: string;
  published_at: string | null;
  featured_image_url: string | null;
  tags: string[];
}

interface PageProps {
  searchParams: Promise<{ tag?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { tag } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, author_name, published_at, featured_image_url, tags")
    .eq("published", true);

  // Filter by tag if provided
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data: posts, error } = await query.order("published_at", { ascending: false });

  if (error) {
    console.error("Error fetching blog posts:", error);
  }

  const blogPosts = (posts || []) as BlogPost[];

  // Get all unique tags for filter
  const { data: allPosts } = await supabase
    .from("blog_posts")
    .select("tags")
    .eq("published", true);

  const allTags = Array.from(
    new Set(allPosts?.flatMap((post) => post.tags || []) || [])
  ).sort();

  // Structured Data for Blog Collection
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Rush N Dush Blog",
    "description": "Real estate insights, home selling tips, and market updates",
    "url": "https://rushndu.sh/blog",
    "publisher": {
      "@type": "Organization",
      "name": "Rush N Dush",
      "logo": {
        "@type": "ImageObject",
        "url": "https://rushndu.sh/logo.png",
      },
    },
    "blogPost": blogPosts.map((post) => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "url": `https://rushndu.sh/blog/${post.slug}`,
      "datePublished": post.published_at,
      "author": {
        "@type": "Person",
        "name": post.author_name,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <nav aria-label="Breadcrumb" className="text-sm mb-4">
              <ol className="flex items-center space-x-2 text-gray-500">
                <li>
                  <Link href="/" className="hover:text-blue-600">
                    Home
                  </Link>
                </li>
                <li>
                  <span>/</span>
                </li>
                <li className="text-gray-900 font-medium">Blog</li>
              </ol>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">
              {tag ? `${tag} Articles` : "Real Estate Blog"}
            </h1>
            <p className="text-xl text-gray-600 mt-3">
              Expert insights, tips, and updates to help you navigate the real estate market
            </p>
          </div>
        </header>

        {/* Blog Posts Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {blogPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {tag ? `No posts found with tag "${tag}".` : "No blog posts yet. Check back soon!"}
              </p>
              {tag && (
                <Link
                  href="/blog"
                  className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Posts →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  {post.featured_image_url ? (
                    <Link href={`/blog/${post.slug}`} className="block aspect-video bg-gray-200 relative">
                      <Image
                        src={post.featured_image_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </Link>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-700" />
                  )}
                  <div className="p-6">
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.slice(0, 3).map((tagItem) => (
                          <Link
                            key={tagItem}
                            href={`/blog?tag=${encodeURIComponent(tagItem)}`}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            {tagItem}
                          </Link>
                        ))}
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-gray-900 mb-3">
                      <Link href={`/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                        {post.title}
                      </Link>
                    </h2>
                    {post.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {post.author_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{post.author_name}</span>
                      </div>
                      {post.published_at && (
                        <time dateTime={post.published_at}>
                          {new Date(post.published_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
