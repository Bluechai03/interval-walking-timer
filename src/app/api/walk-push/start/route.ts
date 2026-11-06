import { start } from "workflow/api";
import { walkPushes } from "../../../../../workflows/walk-pushes";
import { sanitizePlanConfig, buildPlan, totalSeconds } from "@/lib/plan";
import { pushCues } from "@/lib/push-cues";

export const runtime = "nodejs";

// Longest walk we will schedule pushes for, so a stranger can't queue days of work.
const MAX_WALK_SECONDS = 4 * 60 * 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    config?: Record<string, unknown>;
    elapsedSeconds?: number;
  } | null;

  const sub = body?.subscription;
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys.auth) {
    return Response.json({ error: "Missing subscription" }, { status: 400 });
  }

  const plan = buildPlan(sanitizePlanConfig(body?.config ?? {}));
  if (totalSeconds(plan) > MAX_WALK_SECONDS) {
    return Response.json({ error: "Walk too long" }, { status: 400 });
  }
  const elapsed = Math.max(0, Math.trunc(Number(body?.elapsedSeconds) || 0));
  const cues = pushCues(plan, elapsed);
  if (cues.length === 0) return Response.json({ runId: null });

  const run = await start(walkPushes, [
    { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
    cues,
  ]);
  return Response.json({ runId: run.runId });
}
