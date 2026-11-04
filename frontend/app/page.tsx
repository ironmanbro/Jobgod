import { fetchJobs, PAGE_SIZE } from "@/lib/jobs";
import Link from "next/link";
import JobList from "@/components/JobList";
import Pagination from "@/components/Pagination";
import FilterBar from "@/components/FilterBar";

type SearchParams = Promise<{ q?: string; location?: string; page?: string }>;

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, location, page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  let data;
  try {
    data = await fetchJobs({ q, location, page });
  } catch {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load jobs. Check that the API is running and <code>API_URL</code> is set.
        </p>
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl space-y-3 p-4 sm:p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Jobs</h1>
        <Link href="/saved" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Saved →</Link>
        <span className="text-xs tabular-nums text-zinc-500">{data.total.toLocaleString()} results</span>
      </header>

      <FilterBar q={q} location={location} />

      {data.items.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No jobs match your filters.
        </p>
      ) : (
        <JobList jobs={data.items} />
      )}

      <Pagination page={page} totalPages={totalPages} q={q} location={location} />
    </main>
  );
}
