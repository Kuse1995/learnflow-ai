import { useState, useCallback, useEffect } from "react";
import { PERFORMANCE_MESSAGES } from "@/lib/performance-config";

export type SyncState = "synced" | "pending" | "syncing" | "failed";

interface PendingChange {
  id: string;
  type: string;
  data: unknown;
  timestamp: Date;
  retryCount: number;
}

interface SyncStore {
  pendingChanges: Map<string, PendingChange>;
  subscribers: Set<() => void>;
}

const syncStore: SyncStore = {
  pendingChanges: new Map(),
  subscribers: new Set(),
};

function notifySyncSubscribers() {
  syncStore.subscribers.forEach((cb) => cb());
}

/**
 * Hook for tracking sync status and pending changes
 */
export function useSyncStatus() {
  const [, forceUpdate] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const callback = () => forceUpdate({});
    syncStore.subscribers.add(callback);
    return () => {
      syncStore.subscribers.delete(callback);
    };
  }, []);

  const pendingChanges = Array.from(syncStore.pendingChanges.values());
  const pendingCount = pendingChanges.length;
  const failedCount = pendingChanges.filter((c) => c.retryCount >= 3).length;

  const getSyncState = useCallback((): SyncState => {
    if (isSyncing) return "syncing";
    if (failedCount > 0) return "failed";
    if (pendingCount > 0) return "pending";
    return "synced";
  }, [isSyncing, pendingCount, failedCount]);

  const getMessage = useCallback((): string => {
    const state = getSyncState();
    switch (state) {
      case "pending":
        return PERFORMANCE_MESSAGES.syncPending;
      case "syncing":
        return "Saving changes...";
      case "failed":
        return PERFORMANCE_MESSAGES.syncFailed;
      case "synced":
        return PERFORMANCE_MESSAGES.syncComplete;
    }
  }, [getSyncState]);

  const addPendingChange = useCallback(
    (type: string, data: unknown): string => {
      const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      syncStore.pendingChanges.set(id, {
        id,
        type,
        data,
        timestamp: new Date(),
        retryCount: 0,
      });
      notifySyncSubscribers();
      return id;
    },
    []
  );

  const markSynced = useCallback((id: string) => {
    syncStore.pendingChanges.delete(id);
    notifySyncSubscribers();
  }, []);

  const markFailed = useCallback((id: string) => {
    const change = syncStore.pendingChanges.get(id);
    if (change) {
      syncStore.pendingChanges.set(id, {
        ...change,
        retryCount: change.retryCount + 1,
      });
      notifySyncSubscribers();
    }
  }, []);

  const retryFailed = useCallback(() => {
    syncStore.pendingChanges.forEach((change, id) => {
      if (change.retryCount >= 3) {
        syncStore.pendingChanges.set(id, {
          ...change,
          retryCount: 0,
        });
      }
    });
    notifySyncSubscribers();
  }, []);

  const syncNow = useCallback(
    async (syncFn: (changes: PendingChange[]) => Promise<string[]>) => {
      if (pendingCount === 0 || isSyncing) return;

      setIsSyncing(true);
      try {
        const syncedIds = await syncFn(pendingChanges);
        syncedIds.forEach((id) => markSynced(id));
      } finally {
        setIsSyncing(false);
      }
    },
    [pendingCount, pendingChanges, isSyncing, markSynced]
  );

  return {
    syncState: getSyncState(),
    message: getMessage(),
    pendingCount,
    failedCount,
    isSyncing,
    pendingChanges,
    addPendingChange,
    markSynced,
    markFailed,
    retryFailed,
    syncNow,
  };
}
