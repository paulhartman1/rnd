// Service Worker for Push Notifications
// This handles background push events and displays notifications

self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Error parsing push data:', e);
    data = { title: 'New Lead', body: 'A new lead has been received' };
  }

  const title = data.title || '🏠 New Lead Alert';
  const options = {
    body: data.body || 'A new lead has been received',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    tag: data.tag || 'lead-notification',
    requireInteraction: true, // Keep notification visible until user interacts
    data: {
      url: data.url || '/admin/leads',
      leadId: data.leadId,
    },
    actions: [
      {
        action: 'view',
        title: 'View Lead',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      }
    ],
    vibrate: [200, 100, 200], // Vibration pattern
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/admin/leads';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          // Check if there's already a window open
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes('/admin') && 'focus' in client) {
              return client.focus().then(client => {
                if ('navigate' in client) {
                  return client.navigate(urlToOpen);
                }
              });
            }
          }
          // No window open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.registration.scope.includes('localhost') 
        ? null 
        : urlBase64ToUint8Array(self.VAPID_PUBLIC_KEY)
    })
    .then(function(subscription) {
      console.log('Resubscribed to push notifications');
      // Send new subscription to server
      return fetch('/api/admin/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    })
  );
});

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
