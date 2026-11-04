import Link from "next/link";

type Props = { page: number; totalPages: number; q?: string; location?: string };

export default function Pagination({ page, totalPages, q, location }: Props) {
  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (location) sp.set("location", location);
    sp.set("page", String(p));
    return `/?${sp}`;
  };
  const btn = "rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700";
  const off = "pointer-events-none opacity-40";

  return (
    <nav className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
      <Link href={href(page - 1)} aria-disabled={page <= 1} className={`${btn} ${page <= 1 ? off : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
        ← Prev
      </Link>
      <span className="tabular-nums">Page {page} of {totalPages}</span>
      <Link href={href(page + 1)} aria-disabled={page >= totalPages} className={`${btn} ${page >= totalPages ? off : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
        Next →
      </Link>
    </nav>
  );
}
