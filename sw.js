// Minimal service worker: caches the page shell so the site opens fast and works for repeat visitors on poor mobile signal.
// Videos are NOT cached (large). Bump VERSION whenever you rebuild.
const VERSION = 'he-1791832645506';
const SHELL = ['index.html', 'menu.html', 'tiffin.html', 'catering.html', 'story.html', 'sweets.html', 'delivery.html', 'allergens.html', 'privacy.html', 'terms.html', '404.html', 'contact.html', 'share.html', 'css/style.css', 'css/immersive.css', 'css/share.css', 'js/main.js', 'js/share.js', 'js/immersive.js', 'js/live.js', 'img/logo.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/media/')) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
