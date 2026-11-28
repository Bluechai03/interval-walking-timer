import { sleep } from "workflow";
import type { PushSubscription } from "web-push";
import type { PushCue } from "@/lib/push-cues";

// One run per walk. It sleeps until each phase change (no compute while asleep),
// then sends that phase's notification. Cancelled from /api/walk-push/cancel.
export async function walkPushes(subscription: PushSubscription, cues: PushCue[]) {
  "use workflow";

  let waited = 0;
  for (const cue of cues) {
    await sleep(`${cue.delaySeconds - waited}s`);
    waited = cue.delaySeconds;
    await sendCue(subscription, cue);
  }
}

async function sendCue(subscription: PushSubscription, cue: PushCue) {
  "use step";

  const { default: webpush } = await import("web-push");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  try {
    await webpush.sendNotification(
      subscription,
      // Its own tag for every cue. With one shared tag, an iPhone can replace the cue still
      // sitting in Notification Center without showing a banner for the new one.
      JSON.stringify({ title: cue.title, body: cue.body, tag: `phase-${crypto.randomUUID()}` }),
      { TTL: 60, urgency: "high" },
    );
  } catch (error) {
    // The phone has unsubscribed or the subscription expired: retrying won't help.
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return;
    throw error;
  }
}
