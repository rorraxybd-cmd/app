// sw.js - Service Worker for MESSAGE PWA (rorraxy.com)
// Auto-update + Push Notification (Call & Message) + Offline fallback

const CACHE_VERSION = 'v50.0';
const CACHE_NAME = 'message-cache-' + CACHE_VERSION;
const RUNTIME_CACHE = 'message-runtime-' + CACHE_VERSION;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/call.js?v=50.0',
  '/message.js?v=50.0',
  '/discover.js?v=50.0',
  '/verify.js?v=50.0'
];

// ─────────────────────────────────────────────────────────
// INSTALL & ACTIVATE
// ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME && name !== RUNTIME_CACHE) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
});

// ─────────────────────────────────────────────────────────
// PUSH NOTIFICATION
// ─────────────────────────────────────────────────────────
self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }

  const isCall = data.type === 'incoming_call';
  const isVideo = data.call_type === 'video';

  const title = isCall
    ? (data.caller_name || data.caller_phone || 'Unknown') + ' — ' + (isVideo ? 'Video Call' : 'Voice Call')
    : (data.title || 'New Message');

  const body = isCall
    ? 'Incoming call · Tap Answer to talk'
    : (data.body || 'Tap to open MESSAGE');

  const tag = isCall
    ? 'call-' + (data.call_id || data.caller_phone || Date.now())
    : 'msg-' + (data.sender_phone || Date.now());

  const options = {
    body,
    icon: data.avatar || 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg',
    badge: 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg',
    vibrate: isCall ? [700, 300, 700, 300, 700] : [200, 100, 200],
    tag,
    renotify: true,
    silent: false,
    requireInteraction: isCall,
    data,
    actions: isCall
      ? [
          { action: 'accept', title: '✅ Answer' },
          { action: 'decline', title: '❌ Decline' }
        ]
      : []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─────────────────────────────────────────────────────────
// NOTIFICATION CLICK
// ─────────────────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const data = event.notification.data || {};

  // ── DECLINE: caller-কে "ended" signal পাঠাও ──
  if (event.action === 'decline') {
    if (data.caller_phone && data.receiver_phone) {
      event.waitUntil(
        fetch('/api/chat?action=send_call_signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caller_phone: data.receiver_phone,
            receiver_phone: data.caller_phone,
            call_type: data.call_type || 'audio',
            status: 'ended',
            timestamp: Date.now()
          })
        }).catch(() => {})
      );
    }
    return;
  }

  // ── ACCEPT / OPEN: window focus বা নতুন খোলো ──
  const targetUrl = data.type === 'incoming_call'
    ? '/?incoming_call=1' +
      '&caller_phone=' + encodeURIComponent(data.caller_phone || '') +
      '&call_type=' + encodeURIComponent(data.call_type || 'audio')
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'notification_action',
            action: event.action || 'open',
            payload: data
          });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ─────────────────────────────────────────────────────────
// PUSH SUBSCRIPTION EXPIRED — auto refresh
// ─────────────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil((async () => {
    try {
      const oldSub = event.oldSubscription ||
        await self.registration.pushManager.getSubscription();
      if (!oldSub) return;
      const newSub = await self.registration.pushManager.subscribe(oldSub.options);
      // phone জানা নেই — active client-কে জানাও, সে API কল করবে
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.postMessage({
        type: 'push_subscription_changed',
        subscription: newSub.toJSON()
      }));
    } catch (e) {}
  })());
});

// ─────────────────────────────────────────────────────────
// FETCH — Network first, cache fallback
// ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // API, R2, cross-origin — ক্যাশ করব না
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('r2.dev') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(event.request, clone)).catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const idx = await caches.match('/index.html');
          if (idx) return idx;
        }
        return new Response('Offline — please check your connection', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
