// Same-origin proxy so the browser can load details without CORS.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const base = process.env.API_URL ?? "http://localhost:8000";
  const res = await fetch(`${base}/api/jobs/${id}`, { next: { revalidate: 300 } });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}
