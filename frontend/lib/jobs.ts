export type Job = {
  id: number;
  company: string;
  title: string;
  location: string | null;
  department: string | null;
  employment_type: string | null;
  url: string;
  posted_at: string | null;
};

export type JobPage = { total: number; page: number; page_size: number; items: Job[] };

export type JobQuery = { q?: string; location?: string; page?: number };

export const PAGE_SIZE = 25;

export async function fetchJobs({ q, location, page = 1 }: JobQuery): Promise<JobPage> {
  const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
  if (q) params.set("q", q);
  if (location) params.set("location", location);

  const base = process.env.API_URL ?? "http://localhost:8000";
  const res = await fetch(`${base}/api/jobs?${params}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Jobs API responded ${res.status}`);
  return res.json();
}

export type JobDetail = Job & { description: string | null };

/** Best-effort ATS label from the apply URL (company-hosted boards fall back to gh_jid / hostname). */
export function sourceFromUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("greenhouse") || u.searchParams.has("gh_jid")) return "Greenhouse";
    if (u.hostname.includes("lever.co")) return "Lever";
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Unknown";
  }
}

export function formatDate(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "—";
}
