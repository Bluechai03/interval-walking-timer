// Network-first: always fresh when online, falls back to whatever was cached
// on a previous visit so the timer still opens with no signal.
const CACHE = "walking-timer-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE && key !== "push-log").map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached ?? caches.match("/")),
      ),
  );
});

// Throwaway push test (/lab/lock-test): show the cue and record when it arrived, so the page can compare it with when it was sent.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const receivedAt = Date.now();
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title ?? "Walking timer", {
        body: data.body,
        tag: `cue-${data.n ?? receivedAt}`,
      }),
      caches
        .open("push-log")
        .then((cache) =>
          cache.put(`/push-log/${receivedAt}`, new Response(JSON.stringify({ ...data, receivedAt }))),
        ),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/lab/lock-test"));
});
