// IndexedDB wrapper for offline storage
// Handles caching API responses and queuing operations for sync

const DB_NAME = 'AdvantageOffline';
const DB_VERSION = 1;

interface QueuedOperation {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: string;
  token?: string;
  timestamp: number;
  retryCount: number;
}

interface CachedResponse {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for cached API responses
        if (!db.objectStoreNames.contains('apiCache')) {
          const apiCacheStore = db.createObjectStore('apiCache', { keyPath: 'key' });
          apiCacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          apiCacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Store for queued operations when offline
        if (!db.objectStoreNames.contains('queuedOperations')) {
          const queuedStore = db.createObjectStore('queuedOperations', { keyPath: 'id' });
          queuedStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store for cached entities (customers, quotes, orders, etc.)
        if (!db.objectStoreNames.contains('entities')) {
          const entitiesStore = db.createObjectStore('entities', { keyPath: 'id' });
          entitiesStore.createIndex('type', 'type', { unique: false });
          entitiesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.dbReady;
  }

  // ==================== API Cache ====================

  async cacheAPIResponse(key: string, data: unknown, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    const db = await this.getDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('apiCache', 'readwrite');
      const store = tx.objectStore('apiCache');

      const cached: CachedResponse = {
        key,
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
      };

      const request = store.put(cached);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCachedAPIResponse<T>(key: string): Promise<T | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('apiCache', 'readonly');
      const store = tx.objectStore('apiCache');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cached = request.result as CachedResponse | undefined;
        if (!cached) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() > cached.expiresAt) {
          // Delete expired entry
          this.deleteAPIResponse(key);
          resolve(null);
          return;
        }

        resolve(cached.data as T);
      };
    });
  }

  async deleteAPIResponse(key: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('apiCache', 'readwrite');
      const store = tx.objectStore('apiCache');
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearExpiredCache(): Promise<void> {
    const db = await this.getDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('apiCache', 'readwrite');
      const store = tx.objectStore('apiCache');
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);

      const request = index.openCursor(range);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  // ==================== Entity Cache ====================

  async cacheEntity<T extends { id: string }>(type: string, entity: T): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('entities', 'readwrite');
      const store = tx.objectStore('entities');

      const cached = {
        ...entity,
        type,
        timestamp: Date.now(),
      };

      const request = store.put(cached);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cacheEntities<T extends { id: string }>(type: string, entities: T[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve) => {
      const tx = db.transaction('entities', 'readwrite');
      const store = tx.objectStore('entities');

      let completed = 0;
      for (const entity of entities) {
        const cached = {
          ...entity,
          type,
          timestamp: Date.now(),
        };
        const request = store.put(cached);
        request.onerror = () => {
          // Continue on individual errors
          completed++;
        };
        request.onsuccess = () => {
          completed++;
          if (completed === entities.length) {
            resolve();
          }
        };
      }

      if (entities.length === 0) {
        resolve();
      }
    });
  }

  async getCachedEntity<T>(type: string, id: string): Promise<T | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('entities', 'readonly');
      const store = tx.objectStore('entities');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cached = request.result;
        if (!cached || cached.type !== type) {
          resolve(null);
          return;
        }
        resolve(cached as T);
      };
    });
  }

  async getCachedEntities<T>(type: string): Promise<T[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('entities', 'readonly');
      const store = tx.objectStore('entities');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as T[]);
      };
    });
  }

  async deleteCachedEntity(_type: string, id: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('entities', 'readwrite');
      const store = tx.objectStore('entities');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ==================== Queued Operations ====================

  async queueOperation(
    url: string,
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    body?: unknown,
    token?: string
  ): Promise<string> {
    const db = await this.getDB();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('queuedOperations', 'readwrite');
      const store = tx.objectStore('queuedOperations');

      const operation: QueuedOperation = {
        id,
        url,
        method,
        body: body ? JSON.stringify(body) : undefined,
        token,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const request = store.put(operation);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Trigger background sync if available
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready
            .then((registration) => {
              // @ts-expect-error - SyncManager is not in TypeScript lib by default
              registration.sync.register('sync-queued-operations');
            })
            .catch(() => {
              // Background sync not supported
            });
        }
        resolve(id);
      };
    });
  }

  async getQueuedOperations(): Promise<QueuedOperation[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('queuedOperations', 'readonly');
      const store = tx.objectStore('queuedOperations');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async removeQueuedOperation(id: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('queuedOperations', 'readwrite');
      const store = tx.objectStore('queuedOperations');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getQueuedOperationsCount(): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('queuedOperations', 'readonly');
      const store = tx.objectStore('queuedOperations');
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // ==================== Utility ====================

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    const stores = ['apiCache', 'entities', 'queuedOperations'];

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  }
}

export const offlineStorage = new OfflineStorage();
export type { QueuedOperation, CachedResponse };