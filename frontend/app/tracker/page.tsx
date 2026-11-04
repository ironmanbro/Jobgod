"use client";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useCallback, useState } from "react";
import JobDetailDrawer from "@/components/JobDetailDrawer";
import { STATUSES, statusOf, useSavedJobs, type SavedJob, type Status } from "@/hooks/useSavedJobs";
import { formatDate } from "@/lib/jobs";

const ACCENT: Record<Status, string> = {
  Saved: "border-t-zinc-400",
  Applied: "border-t-indigo-500",
  Interviewing: "border-t-amber-500",
  Offer: "border-t-emerald-500",
  Rejected: "border-t-red-500",
};

function CardBody({ job, onOpen }: { job: SavedJob; onOpen?: () => void }) {
  return (
    <div className="cursor-grab rounded-md border border-zinc-200 bg-white p-2.5 text-sm shadow-sm active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900">
      <button type="button" onClick={onOpen} className="block w-full truncate text-left font-medium hover:underline">
        {job.title}
      </button>
      <p className="truncate text-xs text-zinc-500">{job.company} · {job.location ?? "n/a"}</p>
      {job.appliedAt && <p className="mt-1 text-[11px] text-zinc-400">Applied {formatDate(job.appliedAt)}</p>}
    </div>
  );
}

function DraggableCard({ job, onOpen }: { job: SavedJob; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-30" : ""}>
      <CardBody job={job} onOpen={onOpen} />
    </div>
  );
}

function Column({ status, jobs, onOpen }: { status: Status; jobs: SavedJob[]; onOpen: (j: SavedJob) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-md border border-t-4 border-zinc-200 p-2 dark:border-zinc-800 ${ACCENT[status]} ${isOver ? "bg-indigo-50 dark:bg-indigo-950/30" : "bg-zinc-50 dark:bg-zinc-900/40"}`}
    >
      <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
        {status}
        <span className="rounded bg-zinc-200 px-1.5 text-[11px] tabular-nums dark:bg-zinc-800">{jobs.length}</span>
      </h2>
      <div className="flex min-h-24 flex-1 flex-col gap-2">
        {jobs.map((j) => (
          <DraggableCard key={j.id} job={j} onOpen={() => onOpen(j)} />
        ))}
      </div>
    </section>
  );
}

export default function TrackerPage() {
  const { saved, ready, setStatus } = useSavedJobs();
  const [dragId, setDragId] = useState<number | null>(null);
  const [selected, setSelected] = useState<SavedJob | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // distance constraint keeps plain clicks (open drawer) working
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => setDragId(Number(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const target = e.over?.id as Status | undefined;
    if (target && STATUSES.includes(target)) setStatus(Number(e.active.id), target);
  };

  const dragged = saved.find((j) => j.id === dragId);

  return (
    <main className="space-y-3 p-4 sm:p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Application tracker</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/saved" className="text-indigo-600 hover:underline dark:text-indigo-400">Saved list</Link>
          <Link href="/" className="text-indigo-600 hover:underline dark:text-indigo-400">← All jobs</Link>
        </div>
      </header>

      {!ready ? null : saved.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nothing to track yet. Bookmark jobs from the <Link href="/" className="underline">listings</Link>.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STATUSES.map((s) => (
              <Column
                key={s}
                status={s}
                jobs={saved.filter((j) => statusOf(j) === s)}
                onOpen={(j) => { setSelected(j); setOpen(true); }}
              />
            ))}
          </div>
          <DragOverlay>{dragged && <CardBody job={dragged} />}</DragOverlay>
        </DndContext>
      )}
      <JobDetailDrawer job={selected} open={open} onClose={close} />
    </main>
  );
}
