import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/reviews";
import AdminNav from "../admin-nav";
import ReviewsClient from "./reviews-client";

export default async function AdminReviewsPage() {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          Supabase is not configured yet. Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to continue.
        </div>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  const { data, error } = await queryClient
    .from("reviews")
    .select("*")
    .order("display_order", { ascending: true });

  const reviews = (data ?? []) as Review[];

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />
        
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Reviews dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Manage testimonials
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Add, edit, and organize customer testimonials that appear on your landing page.
          </p>
        </header>

        {error ? (
          <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load reviews. Confirm the `reviews` table and RLS policies are applied.
          </div>
        ) : (
          <ReviewsClient initialReviews={reviews} />
        )}
      </div>
    </main>
  );
}
