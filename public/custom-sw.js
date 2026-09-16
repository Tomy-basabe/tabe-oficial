// ==============================================================================
// TABE Background Push & Notification Service Worker Script
// Handles Background Notifications, Web Push, and Clicks when app is closed.
// ==============================================================================

// 1. Listen for Web Push Notifications (wakes up SW even if app is closed)
self.addEventListener('push', function (event) {
  var data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  var title = data.title || 'T.A.B.E. 🎓';
  var options = {
    body: data.body || 'Tenés novedades académicas en TABE.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || ('tabe-alert-' + Date.now()),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/dashboard',
      timestamp: Date.now()
    },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 2. Notification Click Handler (Brings PWA to foreground or opens target URL)
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Notification Close Handler
self.addEventListener('notificationclose', function (event) {
  // Dismissed
});

// 4. Message Handler from main app
self.addEventListener('message', function (event) {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    var payload = event.data.payload || {};
    self.registration.showNotification(payload.title || 'T.A.B.E. 🎓', {
      body: payload.body || '',
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag || 'tabe-alert',
      data: payload.data || { url: '/' },
      vibrate: [200, 100, 200]
    });
  }

  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    var payload = event.data.payload || {};
    var delay = payload.delay || 0;
    if (delay > 0) {
      setTimeout(function () {
        self.registration.showNotification(payload.title || '¡Hora de estudiar! 📚', {
          body: payload.body || 'Mantené tu racha de estudio activa en TABE.',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: payload.tag || 'study-reminder',
          data: { url: payload.url || '/pomodoro' },
          vibrate: [200, 100, 200]
        });
      }, delay);
    }
  }
});