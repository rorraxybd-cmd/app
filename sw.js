const CACHE_NAME = 'message-chat-v1';
const RUNTIME_CACHE = 'message-runtime-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/discover.css',
  '/discover.js',
  '/verify.css',
  '/verify.js',
  '/call.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== RUNTIME_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ব্যাকগ্রাউন্ডে কল বা মেসেজ আসলে পুশ নোটিফিকেশন এবং রিংটোন/ভাইব্রেশন বাজানোর জন্য
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Incoming Call / Message';
    const options = {
        body: data.body || 'You have an incoming call on rorraxy MESSAGE',
        icon: '/im192.jpg',
        badge: '/im192.jpg',
        vibrate: [300, 100, 300, 100, 300, 100, 300],
        tag: 'incoming-call',
        renotify: true,
        actions: [
            { action: 'answer', title: 'Answer Call' },
            { action: 'reject', title: 'Decline' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// নোটিফিকেশনে ক্লিক করলে অ্যাপ ওপেন করা
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    if (event.action === 'answer') {
        event.waitUntil(clients.openWindow('/?action=incoming_call'));
    } else {
        event.waitUntil(clients.openWindow('/'));
    }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (
    url.pathname.includes('/api/') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('r2.dev')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
