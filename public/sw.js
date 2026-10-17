// AssensNu service worker: gør det muligt at vise beskeder og lægge siden på hjemmeskærmen
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((windows) => (windows[0] ? windows[0].focus() : self.clients.openWindow("/"))),
  );
});
