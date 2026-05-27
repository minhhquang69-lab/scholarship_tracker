const V = 'sct-v3'; // bump version to force cache clear on all browsers
const CACHE = ['index.html', 'manifest.json', 'sw.js'];

self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately, don't wait
  e.waitUntil(caches.open(V).then(c => c.addAll(CACHE).catch(() => {})));
});

self.addEventListener('activate', e => {
  // Delete ALL old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== V).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // take control immediately
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Never cache Firebase / Google API calls
  if (url.includes('googleapis') || url.includes('firebasejs') ||
      url.includes('firebaseio') || url.includes('gstatic') ||
      url.includes('identitytoolkit') || !url.startsWith('http')) return;

  // Network first for HTML — always get the freshest version
  if (url.includes('index.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            caches.open(V).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Cache first for other assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          caches.open(V).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
