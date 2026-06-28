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
  const data = e.data?.json() ?? {};
  const type = data.type || "lunch";
  e.waitUntil(
    self.registration.showNotification(data.title || "Mess Manager", {
      body: data.body || "जेवणाची वेळ झाली!",
      icon: data.icon || "/icon-192x192.png",
      badge: data.badge || "/badge.png",
      tag: data.tag || `meal-${type}`,
      renotify: data.renotify ?? true,
      requireInteraction: data.requireInteraction ?? true,
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: { type: type, originalData: data },
      actions: data.actions || [
        { action: `yes_${type}`, title: "✅ Yes, I Ate" },
        { action: `skip_${type}`, title: "❌ Skip" },
        { action: `remind_${type}`, title: "⏰ Remind Me in 3 Minutes" }
      ]
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const action = e.action;
  const data = e.notification.data || {};
  const type = data.type || "lunch";

  if (action === `yes_${type}` || action === `skip_${type}`) {
    const status = action.startsWith("yes") ? "taken" : "skip";
    
    e.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          // Send message to open client to do it in background
          clientList[0].postMessage({ type: 'UPDATE_MEAL', mealType: type, status: status });
        } else {
          // Open app with deep link
          return self.clients.openWindow(`/?action=${status}&type=${type}`);
        }
      })
    );
  } else if (action === `remind_${type}`) {
    // 3 minute snooze
    e.waitUntil(
      new Promise(resolve => {
        setTimeout(() => {
          const originalData = data.originalData || {};
          self.registration.showNotification(e.notification.title, {
            body: e.notification.body,
            icon: e.notification.icon,
            badge: e.notification.badge,
            tag: e.notification.tag,
            renotify: true,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            data: e.notification.data,
            actions: originalData.actions || [
              { action: `yes_${type}`, title: "✅ Yes, I Ate" },
              { action: `skip_${type}`, title: "❌ Skip" },
              { action: `remind_${type}`, title: "⏰ Remind Me in 3 Minutes" }
            ]
          }).then(resolve);
        }, 3 * 60 * 1000);
      })
    );
  } else {
    // default click
    e.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) return clientList[0].focus();
        return self.clients.openWindow("/");
      })
    );
  }
});
