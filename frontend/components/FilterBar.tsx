import Link from "next/link";

// Plain GET form: submits to /?q=...&location=... with no client JS needed.
export default function FilterBar({ q = "", location = "" }: { q?: string; location?: string }) {
  const input =
    "h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900";
  return (
    <form method="get" action="/" className="flex flex-col gap-2 sm:flex-row">
      <input name="q" defaultValue={q} placeholder="Keyword (e.g. backend engineer)" className={input} />
      <input name="location" defaultValue={location} placeholder="Location" className={`${input} sm:max-w-xs`} />
      <div className="flex gap-2">
        <button className="h-9 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500">
          Search
        </button>
        {(q || location) && (
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
