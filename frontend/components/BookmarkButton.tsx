"use client";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import type { Job } from "@/lib/jobs";

export default function BookmarkButton({ job }: { job: Job }) {
  const { isSaved, toggle } = useSavedJobs();
  const on = isSaved(job.id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove bookmark" : "Save job"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(job);
      }}
      className={`rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 ${on ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"}`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path strokeLinejoin="round" d="M6 3h12v18l-6-4-6 4V3z" />
      </svg>
    </button>
  );
}
