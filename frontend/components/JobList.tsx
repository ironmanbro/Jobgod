"use client";
import { useCallback, useState } from "react";
import JobDetailDrawer from "@/components/JobDetailDrawer";
import type { Job } from "@/lib/jobs";
import JobCard from "./JobCard";

export default function JobList({ jobs }: { jobs: Job[] }) {
  const [selected, setSelected] = useState<Job | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onSelect={() => { setSelected(job); setOpen(true); }} />
        ))}
      </ul>
      <JobDetailDrawer job={selected} open={open} onClose={close} />
    </>
  );
}
