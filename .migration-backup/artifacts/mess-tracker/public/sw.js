const CACHE = "mess-manager-v1";
const PRECACHE = ["/", "/manifest.json", "/logo.svg", "/favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // For API calls — network only
  if (req.url.includes("/api/")) return;
  // For navigation — serve from cache, fallback to network
  e.respondWith(
    caches.match(req).then((cached) => cached ?? fetch(req).catch(() => caches.match("/")))
  );
});

// Push notification handler
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? { title: "Mess Manager", body: "जेवणाची वेळ झाली!" };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: "mess-reminder",
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: "taken",  title: "✓ घेतले" },
        { action: "snooze", title: "⏰ ५ मिनिटे" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "taken") {
    e.waitUntil(self.clients.openWindow("/dashboard"));
  } else if (e.action === "snooze") {
    // Just close — snooze handled client-side
  } else {
    e.waitUntil(self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow("/dashboard");
    }));
  }
});
