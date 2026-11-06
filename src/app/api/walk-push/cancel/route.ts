import { getRun } from "workflow/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { runId?: string } | null;
  if (!body?.runId) return Response.json({ error: "Missing runId" }, { status: 400 });
  try {
    await getRun(body.runId).cancel({ cancelReason: "Walk paused or reset" });
  } catch {
    // Already finished or cancelled: nothing left to stop.
  }
  return Response.json({ cancelled: true });
}
