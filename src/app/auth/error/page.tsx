import Link from "next/link";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { message?: string };
}) {
  const errorMessage = searchParams.message || 
    "The invite link is invalid or has expired. Please contact your administrator for a new invitation.";

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-navy)]">
          Authentication Error
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          {errorMessage}
        </p>
        <div className="mt-6">
          <Link
            href="/admin/login"
            className="text-sm font-semibold text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-4"
          >
            Go to login page
          </Link>
        </div>
      </div>
    </main>
  );
}
