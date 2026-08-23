// DFS - Duty Free Shop Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
// =====================================================
// PUSH NOTIFICATION
// =====================================================
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: 'DFS Duty Free Shop',
      body: event.data ? event.data.text() : 'You have a new message.'
    };
  }
  const title = data.title || 'DFS Duty Free Shop';
  // Icon/badge are forced to the site's own real PNG regardless of what the
  // sending server passes in the payload — this is what stops Android from
  // falling back to a blank white box when an SVG (or a bad/missing URL)
  // gets sent as icon/badge.
  const iconUrl = self.location.origin + '/icon-192.png';
  const options = {
    body: data.body || 'You have a new message.',
    icon: iconUrl,
    badge: iconUrl,
    tag: data.tag || 'dfs-message',
    renotify: true,
    data: data.data || {
      url: 'https://duty-free-shop.vercel.app/'
    }
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
// =====================================================
// NOTIFICATION CLICK
// =====================================================
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl =
    event.notification &&
    event.notification.data &&
    event.notification.data.url
      ? event.notification.data.url
      : 'https://duty-free-shop.vercel.app/';
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // If website is already open
      for (const client of clientList) {
        if ('navigate' in client) {
          return client.navigate(targetUrl)
            .then(function() {
              return client.focus();
            });
        }
      }
      // If website is not open
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
