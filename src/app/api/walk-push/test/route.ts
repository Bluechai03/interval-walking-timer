import webpush from "web-push";

export const runtime = "nodejs";

// Sends one notification to the phone that asked, now, so the walker can tell whether
// reminders reach this phone before a walk depends on them. Only a fixed message goes out.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  } | null;

  const sub = body?.subscription;
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys.auth) {
    return Response.json({ error: "Missing subscription" }, { status: 400 });
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      JSON.stringify({ title: "Strut reminders work", body: "This is a test. Your walk's reminders arrive like this." }),
      { TTL: 60, urgency: "high" },
    );
    return Response.json({ result: "sent" });
  } catch (error) {
    // The push service says this phone's address is gone: no reminder can reach it.
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return Response.json({ result: "expired" });
    return Response.json({ result: "failed" }, { status: 502 });
  }
}
