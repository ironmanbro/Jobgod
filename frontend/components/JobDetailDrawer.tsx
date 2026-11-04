"use client";
import { useEffect, useState } from "react";
import { formatDate, sourceFromUrl, type Job, type JobDetail } from "@/lib/jobs";
import BookmarkButton from "./BookmarkButton";

type Detail = { id: number; description: string | null; error: boolean };

const Tag = ({ label, value }: { label: string; value: string }) => (
  <span className="rounded-md border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700">
    <span className="text-zinc-500">{label}: </span>
    <span className="font-medium">{value}</span>
  </span>
);

export default function JobDetailDrawer({ job, open, onClose }: { job: Job | null; open: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const id = job?.id;

  useEffect(() => {
    if (!open || id === undefined) return;
    const ac = new AbortController();
    fetch(`/api/jobs/${id}`, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<JobDetail>;
      })
      .then((d) => setDetail({ id, description: d.description, error: false }))
      .catch((e) => e.name !== "AbortError" && setDetail({ id, description: null, error: true }));
    return () => ac.abort();
  }, [open, id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const loading = open && job && detail?.id !== job.id;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Job details"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-xl transition-transform duration-200 dark:bg-zinc-950 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {job && (
          <>
            <header className="flex items-start gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-snug">{job.title}</h2>
                <p className="text-sm text-zinc-500">{job.company}</p>
              </div>
              <BookmarkButton job={job} />
              <button onClick={onClose} aria-label="Close" className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800">
                ✕
              </button>
            </header>

            <div className="flex flex-wrap gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
              <Tag label="Location" value={job.location ?? "n/a"} />
              <Tag label="Source" value={sourceFromUrl(job.url)} />
              <Tag label="Posted" value={formatDate(job.posted_at)} />
              {job.department && <Tag label="Team" value={job.department} />}
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed">
              {loading ? (
                <p className="text-zinc-500">Loading description…</p>
              ) : detail?.error ? (
                <p className="text-red-600">Couldn&apos;t load the description.</p>
              ) : (
                <p className="whitespace-pre-line">{detail?.description ?? "No description provided."}</p>
              )}
            </div>

            <footer className="border-t border-zinc-200 p-4 dark:border-zinc-800">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Apply on Company Site ↗
              </a>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
