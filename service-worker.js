// DFS - Duty Free Shop — minimal Service Worker
// Purpose: enables notifications to work properly on mobile Chrome / Android
// (mobile browsers require notifications to be shown via a Service Worker,
// the plain `new Notification()` API used on desktop does not reliably work on mobile).

self.addEventListener('install', function(event) {
  self.skipWaiting();
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

  const options = {
    body: data.body || 'You have a new message.',

    icon: data.icon || '/icon-192.png',

    badge: data.badge || '/icon-192.png',

    tag: data.tag || 'dfs-message',

    renotify: true,

    data: data.data || {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );

});


// =====================================================
// NOTIFICATION CLICK
// =====================================================

// Handles the user tapping/clicking a notification
self.addEventListener('notificationclick', function(event) {

  event.notification.close();

  const targetUrl =
    (event.notification.data &&
     event.notification.data.url) || '/';

  event.waitUntil(

    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {

      // If a tab is already open, focus it and navigate
      // to the right chat/product
      for (const client of clientList) {

        if ('focus' in client) {

          return client.focus().then(function() {

            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }

          });

        }

      }

      // Otherwise open a new tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

    })

  );

});
