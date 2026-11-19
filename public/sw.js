// The timer has to open on a phone with a weak signal or none, so the saved copy
// is served first whenever the network is slow, and refreshed in the background.
const CACHE = "walking-timer-v2";
const STATIC = "/_next/static/";
// How long to wait for the network when a saved copy is ready to use.
const FAST_MS = 1000;
// Saved scripts and styles from older builds are dropped after this long.
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

// The files a page needs are named inside it, so they can be found and saved.
const staticFilesIn = (html) => [...new Set(html.match(/\/_next\/static\/[^"'\s\\)>]+/g) ?? [])];

// Saved when the worker installs, so the first trip offline works. The crew
// pages are not saved: they need a signal, and the offline page says so.
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.add("/offline.html");
  // The workout and the settings both work with no signal.
  const files = new Set();
  for (const page of ["/", "/settings"]) {
    const response = await fetch(page);
    if (!response.ok) continue;
    await cache.put(page, response.clone());
    staticFilesIn(await response.text()).forEach((file) => files.add(file));
  }
  await Promise.all([...files].map((file) => cache.add(file).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Every deploy gives scripts and styles new names. Once the home page no longer
// uses an old one and it is a week old, it goes.
async function prune(html) {
  const cache = await caches.open(CACHE);
  const current = new Set(staticFilesIn(html));
  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith(STATIC) || current.has(pathname)) continue;
    const saved = await cache.match(request);
    const date = Date.parse(saved?.headers.get("date") ?? "");
    if (Number.isNaN(date) || Date.now() - date > KEEP_MS) await cache.delete(request);
  }
}

// Scripts, styles and fonts never change under the same name, so no network trip.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// Everything else: the network if it answers quickly, otherwise the saved copy.
async function quickOrSaved(event, request) {
  const cache = await caches.open(CACHE);
  const { pathname } = new URL(request.url);
  const network = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
      if (request.mode === "navigate" && pathname === "/") event.waitUntil(response.clone().text().then(prune));
    }
    return response;
  });
  const saved = await cache.match(request);
  if (!saved) {
    return network.catch(async () => {
      if (request.mode !== "navigate") return Response.error();
      // A crew page with no signal gets the page that explains it.
      if (pathname.startsWith("/friends")) return cache.match("/offline.html");
      return (await cache.match("/")) ?? Response.error();
    });
  }
  // Let the refresh finish in the background even when the saved copy wins.
  event.waitUntil(network.catch(() => {}));
  const slow = new Promise((resolve) => setTimeout(() => resolve(saved), FAST_MS));
  return Promise.race([network.catch(() => saved), slow]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // The server's own endpoints are never saved.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.well-known/")) return;
  event.respondWith(url.pathname.startsWith(STATIC) ? cacheFirst(request) : quickOrSaved(event, request));
});

// Phase notifications sent by the server while the phone is locked. One shared
// tag so each cue replaces the last instead of stacking up.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Strut", {
      body: data.body,
      tag: "phase",
      renotify: true,
      icon: "/icon/192",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
