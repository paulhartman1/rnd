import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";

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
    .select("title, meta_description, excerpt, featured_image_url, published_at, author_name, tags")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) {
    return {
      title: "Post Not Found | Rush N Dush",
    };
  }

  const description = post.meta_description || post.excerpt || undefined;
  const url = `https://rushndu.sh/blog/${slug}`;
  const imageUrl = post.featured_image_url || "https://rushndu.sh/og-default.jpg";

  return {
    title: `${post.title} | Rush N Dush Blog`,
    description,
    authors: [{ name: post.author_name }],
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description,
      url,
      siteName: "Rush N Dush",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      locale: "en_US",
      type: "article",
      publishedTime: post.published_at || undefined,
      authors: [post.author_name],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
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
  const readingTime = estimateReadingTime(blogPost.content);
  const publishedDate = blogPost.published_at ? new Date(blogPost.published_at).toISOString() : new Date().toISOString();
  const modifiedDate = new Date().toISOString();

  // Fetch related posts by tags
  const { data: relatedPosts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, featured_image_url, tags")
    .eq("published", true)
    .neq("slug", slug)
    .limit(3);

  // JSON-LD Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blogPost.title,
    "description": blogPost.meta_description || blogPost.excerpt,
    "image": blogPost.featured_image_url || "https://rushndu.sh/og-default.jpg",
    "datePublished": publishedDate,
    "dateModified": modifiedDate,
    "author": {
      "@type": "Person",
      "name": blogPost.author_name,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Rush N Dush",
      "logo": {
        "@type": "ImageObject",
        "url": "https://rushndu.sh/logo.png",
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://rushndu.sh/blog/${slug}`,
    },
    "keywords": blogPost.tags?.join(", "),
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://rushndu.sh",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://rushndu.sh/blog",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": blogPost.title,
        "item": `https://rushndu.sh/blog/${slug}`,
      },
    ],
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header with Breadcrumbs */}
        <header className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                <li>
                  <Link href="/blog" className="hover:text-blue-600">
                    Blog
                  </Link>
                </li>
                <li>
                  <span>/</span>
                </li>
                <li className="text-gray-900 font-medium line-clamp-1">
                  {blogPost.title}
                </li>
              </ol>
            </nav>
          </div>
        </header>

        {/* Article */}
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            {/* Featured Image */}
            {blogPost.featured_image_url && (
              <div className="mb-8 rounded-lg overflow-hidden relative aspect-video">
                <Image
                  src={blogPost.featured_image_url}
                  alt={blogPost.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            )}

            {/* Tags */}
            {blogPost.tags && blogPost.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {blogPost.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="text-sm bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {blogPost.title}
            </h1>

            {/* Excerpt */}
            {blogPost.excerpt && (
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {blogPost.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-8 pb-8 border-b">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{blogPost.author_name}</span>
              </div>
              {blogPost.published_at && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <time dateTime={blogPost.published_at}>
                      {new Date(blogPost.published_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </>
              )}
              <span>•</span>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>{readingTime} min read</span>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg prose-blue max-w-none">
              <div className="text-gray-800 leading-relaxed">
                {blogPost.content.split("\n\n").map((paragraph, index) => {
                  if (paragraph.trim() === "") return null;
                  
                  // Basic markdown-like parsing for headers
                  if (paragraph.startsWith("# ")) {
                    return (
                      <h2 key={index} className="text-3xl font-bold text-gray-900 mt-12 mb-6 first:mt-0">
                        {paragraph.substring(2)}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith("## ")) {
                    return (
                      <h3 key={index} className="text-2xl font-bold text-gray-900 mt-10 mb-4">
                        {paragraph.substring(3)}
                      </h3>
                    );
                  }
                  
                  return (
                    <p key={index} className="mb-6 text-lg text-gray-800 leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Author Bio Section */}
            <div className="mt-12 pt-8 border-t">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {blogPost.author_name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {blogPost.author_name}
                  </h3>
                  <p className="text-gray-600">
                    Real estate expert helping homeowners navigate the selling process with confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts && relatedPosts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Articles</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {relatedPosts.map((related) => (
                  <article
                    key={related.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {related.featured_image_url && (
                      <div className="aspect-video bg-gray-200 relative">
                        <Image
                          src={related.featured_image_url}
                          alt={related.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-blue-600">
                        <Link href={`/blog/${related.slug}`}>{related.title}</Link>
                      </h3>
                      {related.excerpt && (
                        <p className="text-gray-600 text-sm line-clamp-2">{related.excerpt}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* CTA at bottom */}
          <div className="mt-16 p-8 md:p-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-center shadow-xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Sell Your House Fast?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Get a no-obligation cash offer today. No repairs, no fees, close on your timeline.
            </p>
            <Link
              href="/get-cash-offer"
              className="inline-block bg-white text-blue-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Get Your Cash Offer →
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
