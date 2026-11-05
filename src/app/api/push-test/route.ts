import { after } from "next/server";
import webpush from "web-push";
import { cueSchedule } from "@/lib/push-test";

// Throwaway endpoint for the push-notification test on /lab/lock-test. Delete after the test.
export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

export async function POST(request: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return Response.json({ error: "VAPID keys are not set on the server" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    subscription?: webpush.PushSubscription;
    count?: number;
    intervalSeconds?: number;
  } | null;
  if (!body?.subscription?.endpoint) {
    return Response.json({ error: "Missing subscription" }, { status: 400 });
  }

  const subscription = body.subscription;
  const cues = cueSchedule(body.count ?? 6, body.intervalSeconds ?? 30);
  webpush.setVapidDetails(subject, publicKey, privateKey);

  // Reply now; send the cues after the response, one every interval, like phase changes in a walk.
  after(async () => {
    for (const cue of cues) {
      await sleep(cue.delaySeconds);
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({ n: cue.n, title: cue.title, body: cue.body, sentAt: Date.now() }),
          { TTL: 60, urgency: "high" },
        );
      } catch (error) {
        console.error("push failed", cue.n, error);
        return;
      }
    }
  });

  return Response.json({ scheduled: cues.length }, { status: 202 });
}
