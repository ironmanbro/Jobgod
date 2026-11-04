"use client";
import { useCallback, useSyncExternalStore } from "react";
import type { Job } from "@/lib/jobs";

export const STATUSES = ["Saved", "Applied", "Interviewing", "Offer", "Rejected"] as const;
export type Status = (typeof STATUSES)[number];

export type SavedJob = Job & { savedAt: string; applied: boolean; status?: Status; appliedAt?: string };

/** Older saved entries only have the `applied` flag. */
export const statusOf = (j: SavedJob): Status => j.status ?? (j.applied ? "Applied" : "Saved");

const KEY = "saved-jobs:v1";
const EMPTY: SavedJob[] = [];
const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: SavedJob[] = EMPTY;

function read(): SavedJob[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch {}
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try { cache = raw ? (JSON.parse(raw) as SavedJob[]) : EMPTY; } catch { cache = EMPTY; }
  return cache;
}

function write(next: SavedJob[]) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const noopSubscribe = () => () => {};

export function useSavedJobs() {
  const saved = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const isSaved = useCallback((id: number) => saved.some((j) => j.id === id), [saved]);

  // localStorage is synchronous, so every update is instantly reflected in all components.
  const toggle = useCallback((job: Job) => {
    const cur = read();
    write(
      cur.some((j) => j.id === job.id)
        ? cur.filter((j) => j.id !== job.id)
        : [{ ...job, savedAt: new Date().toISOString(), applied: false }, ...cur],
    );
  }, []);

  const remove = useCallback((id: number) => write(read().filter((j) => j.id !== id)), []);

  const setStatus = useCallback(
    (id: number, status: Status) =>
      write(
        read().map((j) =>
          j.id !== id
            ? j
            : {
                ...j,
                status,
                applied: status !== "Saved",
                appliedAt: status === "Saved" ? j.appliedAt : (j.appliedAt ?? new Date().toISOString()),
              },
        ),
      ),
    [],
  );

  const setApplied = useCallback((id: number, applied: boolean) => setStatus(id, applied ? "Applied" : "Saved"), [setStatus]);

  return { saved, ready, isSaved, toggle, remove, setApplied, setStatus };
}
