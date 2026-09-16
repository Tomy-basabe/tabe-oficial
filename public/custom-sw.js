// ==============================================================================
// TABE Background Push & Notification Service Worker Script
// Handles Background Notifications, Web Push, and Clicks when app is closed.
// ==============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 1. LISTEN FOR WEB PUSH NOTIFICATIONS (Wakes up SW even if app is closed)
// ─────────────────────────────────────────────────────────────────────────────
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
    tag: data.tag || ('tabe-push-' + Date.now()),
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. NOTIFICATION CLICK HANDLER (Brings PWA to foreground or opens target URL)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERIODIC BACKGROUND SYNC & SYNC (Chromium Android Installed PWA)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('periodicsync', function (event) {
  if (event.tag === 'tabe-periodic-sync' || event.tag === 'check-reminders') {
    event.waitUntil(checkOfflineReminders());
  }
});

self.addEventListener('sync', function (event) {
  if (event.tag === 'tabe-sync') {
    event.waitUntil(checkOfflineReminders());
  }
});

// Helper to check IndexedDB offline alarms in background
function checkOfflineReminders() {
  return new Promise(function (resolve) {
    if (!('indexedDB' in self)) return resolve();

    var request = indexedDB.open('tabe_alarms_db', 1);
    request.onerror = function () { resolve(); };
    request.onsuccess = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('alarms')) {
        return resolve();
      }

      var tx = db.transaction('alarms', 'readwrite');
      var store = tx.objectStore('alarms');
      var getAllReq = store.getAll();

      getAllReq.onsuccess = function () {
        var items = getAllReq.result || [];
        var now = new Date();
        var todayStr = now.toISOString().split('T')[0];
        var currentHours = now.getHours();
        var currentMins = now.getMinutes();

        items.forEach(function (item) {
          // Check study reminder
          if (item.id === 'study_reminder' && item.enabled) {
            if (item.lastSentDate !== todayStr && currentHours >= item.hour) {
              self.registration.showNotification('¡Hora de estudiar! 📚', {
                body: 'Mantené tu racha de estudio activa en TABE. ¡Solo unos minutos hacen la diferencia!',
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'study-reminder-' + todayStr,
                data: { url: '/pomodoro' },
                vibrate: [200, 100, 200]
              });
              item.lastSentDate = todayStr;
              store.put(item);
            }
          }

          // Check upcoming exams
          if (item.type === 'exam' && item.examDate) {
            var diffDays = Math.ceil((new Date(item.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= item.daysBefore && diffDays >= 0 && item.lastSentDate !== todayStr) {
              var dayText = diffDays === 0 ? '¡Hoy!' : diffDays === 1 ? 'mañana' : ('en ' + diffDays + ' días');
              self.registration.showNotification('📝 ' + (item.examType || 'Examen') + ': ' + item.title, {
                body: 'Tenés un examen ' + dayText + '. ¡A no aflojar el repaso!',
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'exam-' + item.id + '-' + todayStr,
                data: { url: '/calendario' },
                vibrate: [200, 100, 200]
              });
              item.lastSentDate = todayStr;
              store.put(item);
            }
          }
        });

        tx.oncomplete = function () { resolve(); };
      };
      getAllReq.onerror = function () { resolve(); };
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MESSAGE HANDLER FROM MAIN REACT APP
// ─────────────────────────────────────────────────────────────────────────────
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

  if (event.data.type === 'CHECK_OFFLINE_REMINDERS') {
    checkOfflineReminders();
  }
});
