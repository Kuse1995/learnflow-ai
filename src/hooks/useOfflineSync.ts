/**
 * Offline Sync Hooks
 * 
 * React hooks for offline data capture and synchronization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  queueOfflineData,
  getLocalQueue,
  getPendingItems,
  getQueueStats,
  syncAllPending,
  clearSyncedItems,
  getConflictsForReview,
  resolveConflict,
  isOnline,
  setupConnectivityListeners,
  SyncEntityType,
  SyncQueueStats,
  OfflineSyncItem,
  ConflictResolution,
} from '@/lib/offline-sync';

/**
 * Hook to get offline queue statistics
 */
export function useOfflineQueueStats() {
  const [stats, setStats] = useState<SyncQueueStats>(getQueueStats());

  const refresh = useCallback(() => {
    setStats(getQueueStats());
  }, []);

  useEffect(() => {
    // Refresh on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh]);

  return { stats, refresh };
}

/**
 * Hook to get pending items
 */
export function usePendingItems() {
  const [items, setItems] = useState<OfflineSyncItem[]>(getPendingItems());

  const refresh = useCallback(() => {
    setItems(getPendingItems());
  }, []);

  return { items, refresh };
}

/**
 * Hook to queue data for offline sync
 */
export function useQueueOfflineData() {
  const { toast } = useToast();
  const { refresh } = useOfflineQueueStats();

  return useCallback((
    schoolId: string,
    classId: string | null,
    userId: string,
    entityType: SyncEntityType,
    entityData: Record<string, unknown>
  ) => {
    const itemId = queueOfflineData(schoolId, classId, userId, entityType, entityData);
    refresh();
    
    if (!isOnline()) {
      toast({
        title: 'Saved offline',
        description: 'Your changes will sync when connection is restored.',
      });
    }

    return itemId;
  }, [toast, refresh]);
}

/**
 * Hook to sync all pending items
 */
export function useSyncPending() {
  const { toast } = useToast();
  const { refresh } = useOfflineQueueStats();

  return useMutation({
    mutationFn: async () => {
      if (!isOnline()) {
        throw new Error('No internet connection');
      }
      return syncAllPending();
    },
    onSuccess: (result) => {
      refresh();
      if (result.synced > 0) {
        toast({
          title: 'Sync complete',
          description: `${result.synced} items synced successfully.`,
        });
      }
      if (result.conflicts > 0) {
        toast({
          title: 'Conflicts detected',
          description: `${result.conflicts} items need review.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to automatically sync when coming online
 */
export function useAutoSync() {
  const syncPending = useSyncPending();
  const { stats, refresh } = useOfflineQueueStats();

  useEffect(() => {
    const cleanup = setupConnectivityListeners(
      // On online
      () => {
        refresh();
        if (stats.pending > 0) {
          syncPending.mutate();
        }
      },
      // On offline
      () => {
        refresh();
      }
    );

    return cleanup;
  }, [stats.pending, syncPending, refresh]);
}

/**
 * Hook to clear synced items
 */
export function useClearSyncedItems() {
  const { refresh } = useOfflineQueueStats();

  return useCallback(() => {
    clearSyncedItems();
    refresh();
  }, [refresh]);
}

/**
 * Hook to get conflicts for admin review
 */
export function useConflictsForReview(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['sync-conflicts', schoolId],
    queryFn: () => schoolId ? getConflictsForReview(schoolId) : [],
    enabled: !!schoolId,
  });
}

/**
 * Hook to resolve a conflict
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ itemId, resolution, resolvedBy, schoolId }: {
      itemId: string;
      resolution: ConflictResolution;
      resolvedBy: string;
      schoolId: string;
    }) => {
      const result = await resolveConflict(itemId, resolution, resolvedBy);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-conflicts', variables.schoolId] });
      toast({
        title: 'Conflict resolved',
        description: 'The sync conflict has been resolved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to resolve conflict',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to monitor connectivity status
 */
export function useConnectivityStatus() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const cleanup = setupConnectivityListeners(
      () => setOnline(true),
      () => setOnline(false)
    );
    return cleanup;
  }, []);

  return online;
}
