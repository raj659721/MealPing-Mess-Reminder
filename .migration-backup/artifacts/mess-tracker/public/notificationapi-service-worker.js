// Service worker for web push notifications (Pingram / NotificationAPI)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Mess Tracker", body: event.data.text() };
  }

  const title = data.title || "Mess Tracker";
  const options = {
    body: data.body || data.message || "",
    icon: data.icon || "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
