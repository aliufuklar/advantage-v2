// AdVantage PWA Service Worker
const CACHE_NAME = 'advantage-v1';

// App shell resources to cache immediately on install
const APP_SHELL = [
  '/',
  '/index.html',
];

// API routes to cache for offline viewing
const API_CACHE_ROUTES = [
  '/api/customers',
  '/api/quotes',
  '/api/orders',
  '/api/discoveries',
  '/api/inventory',
  '/api/finance',
  '/api/personnel',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests - cache first, then network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                // Return cached response and refresh in background
                fetch(request)
                  .then((networkResponse) => {
                    if (networkResponse.ok) {
                      cache.put(request, networkResponse.clone());
                    }
                  })
                  .catch(() => {
                    // Network failed, keep cached response
                  });
                return cachedResponse;
              }

              // No cache, try network
              return fetch(request)
                .then((response) => {
                  if (response.ok) {
                    cache.put(request, response.clone());
                  }
                  return response;
                })
                .catch(() => {
                  // Offline and no cache - return offline JSON response
                  return new Response(
                    JSON.stringify({ error: 'Offline', cached: false }),
                    {
                      status: 503,
                      headers: { 'Content-Type': 'application/json' },
                    }
                  );
                });
            });
        })
    );
    return;
  }

  // Handle static assets - cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        return response || fetch(request)
          .then((networkResponse) => {
            // Cache successful responses for static assets
            if (networkResponse.ok && request.method === 'GET') {
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, networkResponse.clone()));
            }
            return networkResponse;
          });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Background sync for queued operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queued-operations') {
    event.waitUntil(syncQueuedOperations());
  }
});

async function syncQueuedOperations() {
  try {
    // Get queued operations from IndexedDB
    const db = await openDB();
    const tx = db.transaction('queuedOperations', 'readwrite');
    const store = tx.objectStore('queuedOperations');
    const operations = await getAllFromStore(store);

    for (const op of operations) {
      try {
        const response = await fetch(op.url, {
          method: op.method,
          headers: {
            'Content-Type': 'application/json',
            ...(op.token && { Authorization: `Bearer ${op.token}` }),
          },
          body: op.body,
        });

        if (response.ok) {
          // Remove from queue on success
          const deleteTx = db.transaction('queuedOperations', 'readwrite');
          await deleteFromStore(deleteTx.objectStore('queuedOperations'), op.id);
        }
      } catch (err) {
        console.error('[SW] Sync failed for operation:', op.id, err);
      }
    }
  } catch (err) {
    console.error('[SW] Sync error:', err);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AdvantageOffline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromStore(store, id) {
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Yeni bildirim',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'AdVantage', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window or open new one
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});