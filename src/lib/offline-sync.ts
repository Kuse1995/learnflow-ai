/**
 * Offline Sync System
 * 
 * Handles offline data capture, queuing, and synchronization
 * for mobile-first environments with unreliable connectivity
 */

import { supabase } from '@/integrations/supabase/client';

export type SyncEntityType = 'attendance' | 'notes' | 'grades' | 'uploads';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
export type ConflictResolution = 'local_wins' | 'server_wins' | 'admin_review' | 'merged';

export interface OfflineSyncItem {
  id: string;
  school_id: string;
  class_id: string | null;
  user_id: string;
  device_id: string | null;
  entity_type: SyncEntityType;
  entity_data: Record<string, unknown>;
  local_timestamp: string;
  server_timestamp: string | null;
  sync_status: SyncStatus;
  conflict_resolution: ConflictResolution | null;
  conflict_resolved_by: string | null;
  conflict_resolved_at: string | null;
  retry_count: number;
  last_retry_at: string | null;
  error_message: string | null;
  synced_at: string | null;
}

export interface SyncQueueStats {
  pending: number;
  syncing: number;
  conflicts: number;
  failed: number;
  synced: number;
}

// Local storage key for offline queue
const OFFLINE_QUEUE_KEY = 'offline_sync_queue';
const DEVICE_ID_KEY = 'device_id';

/**
 * Get or generate device ID
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Queue data for offline sync (stored locally first)
 */
export function queueOfflineData(
  schoolId: string,
  classId: string | null,
  userId: string,
  entityType: SyncEntityType,
  entityData: Record<string, unknown>
): string {
  const deviceId = getDeviceId();
  const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const item: OfflineSyncItem = {
    id,
    school_id: schoolId,
    class_id: classId,
    user_id: userId,
    device_id: deviceId,
    entity_type: entityType,
    entity_data: entityData,
    local_timestamp: new Date().toISOString(),
    server_timestamp: null,
    sync_status: 'pending',
    conflict_resolution: null,
    conflict_resolved_by: null,
    conflict_resolved_at: null,
    retry_count: 0,
    last_retry_at: null,
    error_message: null,
    synced_at: null,
  };

  // Store in local storage
  const queue = getLocalQueue();
  queue.push(item);
  saveLocalQueue(queue);

  return id;
}

/**
 * Get local offline queue
 */
export function getLocalQueue(): OfflineSyncItem[] {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save local queue
 */
function saveLocalQueue(queue: OfflineSyncItem[]): void {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Get pending items from local queue
 */
export function getPendingItems(): OfflineSyncItem[] {
  return getLocalQueue().filter(item => item.sync_status === 'pending');
}

/**
 * Get queue statistics
 */
export function getQueueStats(): SyncQueueStats {
  const queue = getLocalQueue();
  return {
    pending: queue.filter(i => i.sync_status === 'pending').length,
    syncing: queue.filter(i => i.sync_status === 'syncing').length,
    conflicts: queue.filter(i => i.sync_status === 'conflict').length,
    failed: queue.filter(i => i.sync_status === 'failed').length,
    synced: queue.filter(i => i.sync_status === 'synced').length,
  };
}

/**
 * Sync a single item to the server
 */
export async function syncItem(item: OfflineSyncItem): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
  // Update status to syncing
  updateLocalItemStatus(item.id, 'syncing');

  try {
    // Queue to server
    const { error } = await supabase.rpc('queue_offline_data', {
      p_school_id: item.school_id,
      p_class_id: item.class_id,
      p_user_id: item.user_id,
      p_device_id: item.device_id,
      p_entity_type: item.entity_type,
      p_entity_data: JSON.parse(JSON.stringify(item.entity_data)),
      p_local_timestamp: item.local_timestamp,
    });

    if (error) {
      updateLocalItemStatus(item.id, 'failed', error.message);
      return { success: false, error: error.message };
    }

    // Mark as synced
    updateLocalItemStatus(item.id, 'synced');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    updateLocalItemStatus(item.id, 'failed', message);
    return { success: false, error: message };
  }
}

/**
 * Update local item status
 */
function updateLocalItemStatus(itemId: string, status: SyncStatus, error?: string): void {
  const queue = getLocalQueue();
  const index = queue.findIndex(i => i.id === itemId);
  if (index >= 0) {
    queue[index].sync_status = status;
    if (status === 'failed') {
      queue[index].retry_count += 1;
      queue[index].last_retry_at = new Date().toISOString();
      queue[index].error_message = error || null;
    }
    if (status === 'synced') {
      queue[index].synced_at = new Date().toISOString();
    }
    saveLocalQueue(queue);
  }
}

/**
 * Sync all pending items
 */
export async function syncAllPending(): Promise<{ synced: number; failed: number; conflicts: number }> {
  const pending = getPendingItems();
  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const item of pending) {
    const result = await syncItem(item);
    if (result.success) {
      synced++;
    } else if (result.conflict) {
      conflicts++;
    } else {
      failed++;
    }
  }

  return { synced, failed, conflicts };
}

/**
 * Clear synced items from local queue
 */
export function clearSyncedItems(): void {
  const queue = getLocalQueue();
  const remaining = queue.filter(i => i.sync_status !== 'synced');
  saveLocalQueue(remaining);
}

/**
 * Get conflicts requiring admin review
 */
export async function getConflictsForReview(schoolId: string): Promise<OfflineSyncItem[]> {
  const { data, error } = await supabase
    .from('offline_sync_queue')
    .select('*')
    .eq('school_id', schoolId)
    .eq('sync_status', 'conflict')
    .is('conflict_resolved_at', null)
    .order('local_timestamp', { ascending: true });

  if (error) {
    console.error('Failed to fetch conflicts:', error);
    return [];
  }

  return (data || []) as unknown as OfflineSyncItem[];
}

/**
 * Resolve a conflict
 */
export async function resolveConflict(
  itemId: string,
  resolution: ConflictResolution,
  resolvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('offline_sync_queue')
    .update({
      conflict_resolution: resolution,
      conflict_resolved_by: resolvedBy,
      conflict_resolved_at: new Date().toISOString(),
      sync_status: resolution === 'admin_review' ? 'conflict' : 'synced',
    })
    .eq('id', itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Setup online/offline event listeners
 */
export function setupConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
