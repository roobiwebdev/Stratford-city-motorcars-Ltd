import Link from "next/link";

export default function NotFound() {
  return (
    <main data-surface="dark" className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-center text-bone">
      <p className="admin-eyebrow">Not found</p>
      <h1 className="mt-3 font-display text-3xl">There is nothing at this address</h1>
      <p className="mt-2 text-sm text-bone/60">The page may have moved, or the link is incomplete.</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center border border-bone/30 px-4 text-[0.6875rem] font-medium tracking-[0.1em] uppercase transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
      >
        Go to the overview
      </Link>
    </main>
  );
}
