"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import JobDetailDrawer from "@/components/JobDetailDrawer";
import { useSavedJobs, type SavedJob } from "@/hooks/useSavedJobs";
import { formatDate } from "@/lib/jobs";

export default function SavedPage() {
  const { saved, ready, remove, setApplied } = useSavedJobs();
  const [selected, setSelected] = useState<SavedJob | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const applied = saved.filter((j) => j.applied).length;
  const th = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-500";

  return (
    <main className="mx-auto max-w-5xl space-y-3 p-4 sm:p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Saved jobs</h1>
        <div className="flex items-baseline gap-4">
          <span className="text-xs tabular-nums text-zinc-500">{saved.length} saved · {applied} applied</span>
          <Link href="/tracker" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Tracker</Link>
          <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">← All jobs</Link>
        </div>
      </header>

      {!ready ? null : saved.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nothing saved yet. Bookmark jobs from the <Link href="/" className="underline">listings</Link>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className={th}>Role</th><th className={th}>Company</th><th className={th}>Location</th>
                <th className={th}>Saved</th><th className={th}>Applied</th><th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {saved.map((j) => (
                <tr key={j.id} className={j.applied ? "bg-zinc-50/60 text-zinc-500 dark:bg-zinc-900/40" : ""}>
                  <td className="max-w-xs truncate px-3 py-2">
                    <button onClick={() => { setSelected(j); setOpen(true); }} className="font-medium hover:underline">{j.title}</button>
                  </td>
                  <td className="px-3 py-2">{j.company}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2">{j.location ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDate(j.savedAt)}</td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={j.applied} onChange={(e) => setApplied(j.id, e.target.checked)}
                      aria-label={`Mark ${j.title} as applied`} className="size-4 accent-indigo-600" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <a href={j.url} target="_blank" rel="noopener noreferrer" className="mr-3 text-indigo-600 hover:underline dark:text-indigo-400">Apply ↗</a>
                    <button onClick={() => remove(j.id)} className="text-red-600 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <JobDetailDrawer job={selected} open={open} onClose={close} />
    </main>
  );
}
