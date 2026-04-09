import Link from "next/link";

export default function ByeFeliciaPage() {
  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[1.8rem] border border-black/6 bg-white p-8 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Dev detour
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[var(--color-navy)] sm:text-5xl">
          Bye Felicia
        </h1>
        <p className="mt-5 text-base leading-7 text-[var(--color-muted)]">
          You picked <strong>&quot;Yes&quot;</strong> on the first question, so this is your
          premium express lane to absolutely nowhere.
        </p>
        <p className="mt-3 text-base leading-7 text-[var(--color-muted)]">
          No hard feelings. Just vibes, sarcasm, and a dramatic exit.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)]"
          >
            Shuffle back home
          </Link>
        </div>
      </div>
    </main>
  );
}
