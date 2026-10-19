// sw.js — מאפשר להתקין את הגרסה החדשה כאפליקציה ולפתוח אותה מהר.
// רק קבצי האתר עצמו נשמרים במטמון (תמיד מנסים קודם את הרשת). נתונים מהשרת (api) לא נשמרים אף פעם.
const CACHE = 'salamon-v2-shell-1';
const SHELL = ['/salamon/v2', '/salamon/v2/v2.css', '/salamon/v2/core.js', '/salamon/v2/auth.js', '/salamon/v2/feed.js', '/salamon/v2/record.js', '/salamon/v2/chat.js', '/salamon/v2/settings.js', '/salamon/v2/ads.js', '/salamon/v2/boot.js'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('/salamon/v2')) return;
    e.respondWith(fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/salamon/v2'))));
});
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
        const c = list.find(x => x.url.includes('/salamon/v2'));
        return c ? c.focus() : self.clients.openWindow('/salamon/v2');
    }));
});
