"use client";
import BookmarkButton from "@/components/BookmarkButton";
import type { Job } from "@/lib/jobs";

function postedLabel(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function JobCard({ job, onSelect }: { job: Job; onSelect: () => void }) {
  return (
    <li onClick={onSelect} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <BookmarkButton job={job} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <button type="button" onClick={onSelect} className="truncate text-left text-sm font-semibold hover:underline">
            {job.title}
          </button>
          {job.employment_type && (
            <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {job.employment_type}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-zinc-500">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{job.company}</span>
          {job.department && <> · {job.department}</>}
          {" · "}
          {job.location ?? "Location n/a"}
        </p>
      </div>
      <span className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-zinc-500 sm:block">{postedLabel(job.posted_at)}</span>
      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 rounded-md border border-indigo-600 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-600 hover:text-white dark:border-indigo-400 dark:text-indigo-400"
      >
        View / Apply ↗
      </a>
    </li>
  );
}
