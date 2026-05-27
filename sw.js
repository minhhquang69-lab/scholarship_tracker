const V = 'sct-v1';
const CACHE = ['index.html', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(CACHE).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Don't intercept Firebase, Google, or external API calls
  if (url.includes('googleapis') || url.includes('firebasejs') ||
      url.includes('firebaseio') || url.includes('gstatic') ||
      url.includes('identitytoolkit') || !url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(V).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
