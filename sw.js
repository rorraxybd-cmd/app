// sw.js - Auto Update Service Worker for PWA (rorraxy MESSAGE)
const CACHE_NAME = 'message-cache-v49.0'; // কোড আপডেট করার সময় শুধু এই ভার্সন নম্বরটি বাড়িয়ে দেবেন
const RUNTIME_CACHE = 'message-runtime-v49.0';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ইনস্টল করার সময় নতুন ক্যাশ স্টোর করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// এক্টিভেশনের সময় পুরোনো সমস্ত ক্যাশ স্বয়ংক্রিয়ভাবে মুছে ফেলা
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

// পুশ নোটিফিকেশন হ্যান্ডলার
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'New Message / Incoming Call';
    const options = {
        body: data.body || 'Tap to open rorraxy MESSAGE',
        icon: 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg',
        badge: 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg',
        vibrate: [300, 100, 300, 100, 300],
        tag: 'rorraxy-alert',
        renotify: true
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// নোটিফিকেশন ক্লিক হ্যান্ডলার
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});

// ফেচ ও নেটওয়ার্ক ফার্স্ট স্ট্র্যাটেজি (লেটেস্ট ডাটা নিশ্চিত করার জন্য)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // এপিআই বা ক্লাউডফ্লেয়ারের রিকোয়েস্টগুলো ক্যাশ করা থেকে বিরত রাখা
  if (
    url.pathname.includes('/api/') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('r2.dev')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
