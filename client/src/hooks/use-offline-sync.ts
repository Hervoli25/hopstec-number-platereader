import { useState, useEffect, useCallback, useRef } from "react";
import {
  enqueueRequest,
  syncPendingRequests,
  getPendingCount,
} from "@/lib/offline-queue";

export interface OfflineSyncState {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Number of pending requests queued for sync */
  pendingCount: number;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Manually trigger sync (useful for retry buttons) */
  triggerSync: () => Promise<number>;
  /**
   * Offline-aware fetch wrapper. If offline, enqueues the request.
   * Returns true if the request was sent immediately, false if queued.
   */
  offlineFetch: (method: string, url: string, data?: unknown) => Promise<{ sent: boolean; response?: Response }>;
}

export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB might not be available
    }
  }, []);

  // Sync pending requests
  const triggerSync = useCallback(async (): Promise<number> => {
    if (syncingRef.current || !navigator.onLine) return 0;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const synced = await syncPendingRequests();
      await refreshCount();
      return synced;
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshCount]);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial count
    refreshCount();

    // Sync on mount if online and there are pending items
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync, refreshCount]);

  // Offline-aware fetch
  const offlineFetch = useCallback(
    async (
      method: string,
      url: string,
      data?: unknown
    ): Promise<{ sent: boolean; response?: Response }> => {
      if (navigator.onLine) {
        try {
          const response = await fetch(url, {
            method,
            headers: data ? { "Content-Type": "application/json" } : {},
            body: data ? JSON.stringify(data) : undefined,
            credentials: "include",
          });
          return { sent: true, response };
        } catch {
          // Network error even though navigator.onLine — queue it
          await enqueueRequest(method, url, data);
          await refreshCount();
          return { sent: false };
        }
      } else {
        await enqueueRequest(method, url, data);
        await refreshCount();
        return { sent: false };
      }
    },
    [refreshCount]
  );

  return {
    isOnline,
    pendingCount,
    isSyncing,
    triggerSync,
    offlineFetch,
  };
}

