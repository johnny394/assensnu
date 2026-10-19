// AssensNu service worker: gør det muligt at vise beskeder og lægge siden på hjemmeskærmen
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

// Besked fra serveren, når restauranten svarer. Kommer også, når AssensNu er lukket.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "AssensNu", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const same = windows.find((w) => w.url === url);
      if (same) return same.focus();
      if (windows[0] && "navigate" in windows[0]) return windows[0].navigate(url).then((w) => w && w.focus());
      return self.clients.openWindow(url);
    }),
  );
});
