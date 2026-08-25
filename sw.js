// sw.js — minimal offline app-shell cache for Vidyarthi.
// Bump CACHE_NAME whenever app files change to invalidate old caches.
const CACHE_NAME = "vidyarthi-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/letters.js",
  "./js/app.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for app-shell files; network-first fallback for everything else
// (so Google Fonts / speech synthesis network calls aren't broken by the SW).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return res;
          })
          .catch(() => cached);
      })
    );
  }
  // Cross-origin (fonts, TTS-related network calls) — let the browser handle normally.
});
