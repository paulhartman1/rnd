import Link from "next/link";

export default function ByeFeliciaPage() {
  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[1.8rem] border border-black/6 bg-white p-8 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Awkward
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[var(--color-navy)] sm:text-5xl">
          Well, this is embarrassing... 😅
        </h1>
        <p className="mt-5 text-base leading-7 text-[var(--color-muted)]">
          Looks like you already have a real estate agent working on your property. We totally respect that hustle!
        </p>
        <p className="mt-3 text-base leading-7 text-[var(--color-muted)]">
          We can't swoop in and steal their thunder (or their commission) — that would be super uncool. Your agent is out there doing open houses, taking photos, and answering midnight texts about granite countertops.
        </p>
        <p className="mt-3 text-base leading-7 text-[var(--color-muted)]">
          But hey, if things change and you decide to go the fast cash route instead, we'll be right here with open arms and a calculator. 🏠💰
        </p>
        <div className="mt-8 rounded-2xl bg-[var(--color-surface-soft)] p-5">
          <p className="text-sm font-bold text-[var(--color-navy)]">
            Pro tip:
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            If your listing contract expires or you're looking to sell a different property without an agent, come back and see us. We promise not to hold this against you. 😉
          </p>
        </div>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)]"
          >
            Back to Home Page
          </Link>
        </div>
      </div>
    </main>
  );
}
