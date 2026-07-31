/**
 * Service worker — makes the app itself load with no signal.
 *
 * Project data (photos, renders, selections) already lives in IndexedDB and
 * needs nothing from here. What this covers is the shell: without it, a tablet
 * that reloads in a driveway with no bars gets a browser error page and the
 * appointment stops, even though every byte of the customer's work is on disk.
 *
 * Vite fingerprints its output, so hashed assets are safe to cache forever and
 * a deploy simply requests new URLs. The old cache is dropped on activate.
 */

const CACHE = 'wd-visualizer-v1';

// Cached on demand rather than pre-listed: the built filenames are hashed and
// change every deploy, so an install-time manifest would go stale immediately.
const CACHEABLE = /\.(?:js|css|woff2?|png|jpe?g|svg|webp|ico)$/;

self.addEventListener('install', (event) => {
  // The shell is the one thing worth having before the first offline load.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/index.html'])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API calls must never be served stale — a cached render or detection would
  // be worse than an honest failure the UI can report.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first so a deploy is picked up, cache as the fallback
  // that keeps the app usable offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((hit) => hit ?? Response.error())),
    );
    return;
  }

  if (!CACHEABLE.test(url.pathname)) return;

  // Hashed assets are immutable, so a cache hit is always correct.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
