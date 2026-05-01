// Hook to detect online/offline state and manage offline operations queue
import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';

export interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  queuedOperationsCount: number;
  lastSyncTime: number | null;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queuedOperationsCount, setQueuedOperationsCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const syncInProgressRef = useRef<boolean>(false);

  // Update queued operations count
  const updateQueuedCount = useCallback(async () => {
    try {
      const count = await offlineStorage.getQueuedOperationsCount();
      setQueuedOperationsCount(count);
    } catch (err) {
      console.error('[useOffline] Failed to get queued count:', err);
    }
  }, []);

  // Sync queued operations when back online
  const syncQueuedOperations = useCallback(async () => {
    if (syncInProgressRef.current || !navigator.onLine) return;

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const operations = await offlineStorage.getQueuedOperations();

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
            await offlineStorage.removeQueuedOperation(op.id);
          }
        } catch (err) {
          console.error('[useOffline] Sync failed for operation:', op.id, err);
        }
      }

      setLastSyncTime(Date.now());
    } catch (err) {
      console.error('[useOffline] Sync error:', err);
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
      await updateQueuedCount();
    }
  }, [updateQueuedCount]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      syncQueuedOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial count
    updateQueuedCount();

    // Periodic cleanup of expired cache
    const cleanupInterval = setInterval(() => {
      offlineStorage.clearExpiredCache().catch(console.error);
    }, 60000); // Every minute

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(cleanupInterval);
    };
  }, [syncQueuedOperations, updateQueuedCount]);

  // Auto-sync when online and queued operations exist
  useEffect(() => {
    if (isOnline && queuedOperationsCount > 0 && !syncInProgressRef.current) {
      syncQueuedOperations();
    }
  }, [isOnline, queuedOperationsCount, syncQueuedOperations]);

  return {
    isOnline,
    isSyncing,
    queuedOperationsCount,
    lastSyncTime,
    syncQueuedOperations,
    updateQueuedCount,
  };
}

// Hook for making API requests with offline support
export function useOfflineApi() {
  const { isOnline } = useOffline();

  const makeRequest = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      if (!isOnline) {
        // Return a mock error response
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return fetch(url, options);
    },
    [isOnline]
  );

  return {
    makeRequest,
    isOnline,
  };
}

// Component to show offline indicator
export function OfflineIndicator() {
  const { isOnline, queuedOperationsCount } = useOffline();

  if (isOnline && queuedOperationsCount === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 20px',
        backgroundColor: isOnline ? '#f59e0b' : '#ef4444',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isOnline ? '#22c55e' : '#ffffff',
          animation: isOnline && queuedOperationsCount > 0 ? 'pulse 1.5s infinite' : 'none',
        }}
      />
      {!isOnline
        ? 'Offline - Changes will sync when connected'
        : `${queuedOperationsCount} change${queuedOperationsCount > 1 ? 's' : ''} pending`}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}