// VisionTrack Service Worker - Real Web Push & Action Handling
// Built for Vision Datalabs Software Quality & Issue Management System

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 VisionTrack Notification',
    message: 'New update on VisionTrack',
    url: '/dashboard',
    tag: 'visiontrack-notification',
    requireInteraction: false,
    badge: '/logo.png',
    icon: '/logo.png',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (err) {
    if (event.data) {
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message || data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    tag: data.tag || `vt-${Date.now()}`,
    data: {
      url: data.url || '/dashboard',
      issueId: data.issueId,
      timestamp: Date.now()
    },
    requireInteraction: true, // Pops in front and stays visible until interacted with
    vibrate: [300, 100, 300, 100, 300],
    renotify: true,
    actions: [
      { action: 'open', title: 'Open Issue' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data || {};
  // Support both url (from web push) and issueCode (from local SW notifications)
  let targetUrl = '/dashboard';
  if (data.url) {
    targetUrl = data.url;
  } else if (data.issueCode) {
    targetUrl = `/issues/${data.issueCode}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a VisionTrack window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
