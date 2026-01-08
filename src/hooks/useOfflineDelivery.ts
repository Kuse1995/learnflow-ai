/**
 * Offline-Resilient Delivery Hook
 * 
 * Provides:
 * - Network status monitoring
 * - Local queue management
 * - Automatic sync on reconnection
 * - Delivery status tracking
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DeliveryState,
  RetryConfig,
  RETRY_CONFIGS,
  DEFAULT_RETRY_CONFIG,
  getChannelFallback,
  calculateBackoff,
  getOfflineQueue,
  addToOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  isOnline,
  subscribeToNetworkStatus,
  OfflineQueueItem,
} from "@/lib/delivery-state-machine";
import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];
type DeliveryChannel = Database["public"]["Enums"]["delivery_channel"];

// ============================================================================
// NETWORK STATUS HOOK
// ============================================================================

export function useNetworkStatus() {
  const [online, setOnline] = useState(isOnline());
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus(
      () => {
        setOnline(true);
        if (!online) setWasOffline(true);
      },
      () => setOnline(false)
    );
    return unsubscribe;
  }, [online]);

  const dismissOfflineNotice = useCallback(() => {
    setWasOffline(false);
  }, []);

  return { online, wasOffline, dismissOfflineNotice };
}

// ============================================================================
// OFFLINE QUEUE HOOK
// ============================================================================

export function useOfflineQueue(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  const { online, wasOffline, dismissOfflineNotice } = useNetworkStatus();
  const [localQueue, setLocalQueue] = useState<OfflineQueueItem[]>([]);

  // Load local queue on mount
  useEffect(() => {
    setLocalQueue(getOfflineQueue());
  }, []);

  // Queue a message locally when offline
  const queueLocally = useCallback(
    (payload: OfflineQueueItem["payload"], priority = 2) => {
      if (!schoolId) return null;

      const item = addToOfflineQueue({
        payload,
        priority,
        schoolId,
        deviceId: navigator.userAgent.slice(0, 50),
      });

      setLocalQueue(getOfflineQueue());
      return item;
    },
    [schoolId]
  );

  // Sync local queue to server
  const syncQueue = useMutation({
    mutationFn: async () => {
      if (!schoolId || !online) return { synced: 0, failed: 0 };

      const queue = getOfflineQueue();
      let synced = 0;
      let failed = 0;

      for (const item of queue) {
        try {
          // Create the message on the server
          const { error } = await supabase.from("parent_messages").insert({
            school_id: schoolId,
            student_id: item.payload.studentId,
            parent_contact_id: item.payload.parentContactId,
            category: item.payload.category as Database["public"]["Enums"]["message_category"],
            message_body: item.payload.messageBody,
            subject: item.payload.subject,
            delivery_status: "queued" as DeliveryStatus,
            queued_offline: true,
          });

          if (error) throw error;

          // Remove from local queue
          removeFromOfflineQueue(item.id);
          synced++;
        } catch {
          failed++;
        }
      }

      setLocalQueue(getOfflineQueue());
      return { synced, failed };
    },
    onSuccess: (result) => {
      if (result.synced > 0) {
        toast.success(`${result.synced} message(s) synced`);
        queryClient.invalidateQueries({ queryKey: ["queued-messages"] });
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} message(s) failed to sync`);
      }
      dismissOfflineNotice();
    },
  });

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && online && localQueue.length > 0) {
      syncQueue.mutate();
    }
  }, [wasOffline, online, localQueue.length, syncQueue]);

  return {
    online,
    wasOffline,
    localQueue,
    queueCount: localQueue.length,
    queueLocally,
    syncQueue: syncQueue.mutate,
    isSyncing: syncQueue.isPending,
    clearLocalQueue: () => {
      clearOfflineQueue();
      setLocalQueue([]);
    },
    dismissOfflineNotice,
  };
}

// ============================================================================
// DELIVERY ATTEMPTS HOOK
// ============================================================================

export interface DeliveryAttempt {
  id: string;
  message_id: string;
  channel: DeliveryChannel;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  succeeded: boolean | null;
  error_code: string | null;
  latency_ms: number | null;
}

export function useDeliveryAttempts(messageId: string | undefined) {
  return useQuery({
    queryKey: ["delivery-attempts", messageId],
    queryFn: async () => {
      if (!messageId) return [];

      const { data, error } = await supabase
        .from("delivery_attempts")
        .select("*")
        .eq("message_id", messageId)
        .order("attempt_number", { ascending: true });

      if (error) throw error;
      return data as DeliveryAttempt[];
    },
    enabled: !!messageId,
  });
}

// ============================================================================
// DELIVERY STATUS TRACKING
// ============================================================================

export interface MessageDeliveryInfo {
  messageId: string;
  state: DeliveryState;
  currentChannel: DeliveryChannel | null;
  attempts: number;
  nextRetryAt: string | null;
  channelStatuses: {
    whatsapp: { attempted: boolean; failed: boolean };
    sms: { attempted: boolean; failed: boolean };
    email: { attempted: boolean; failed: boolean };
  };
  isExhausted: boolean;
}

export function useMessageDeliveryStatus(messageId: string | undefined) {
  return useQuery({
    queryKey: ["message-delivery-status", messageId],
    queryFn: async (): Promise<MessageDeliveryInfo | null> => {
      if (!messageId) return null;

      const { data: msg, error } = await supabase
        .from("parent_messages")
        .select(`
          id,
          delivery_status,
          attempted_channel,
          retry_count,
          next_retry_at,
          whatsapp_attempted,
          whatsapp_failed_at,
          sms_attempted,
          sms_failed_at,
          email_attempted,
          email_failed_at
        `)
        .eq("id", messageId)
        .single();

      if (error) throw error;

      const state: DeliveryState = 
        msg.delivery_status === "delivered" ? "delivered" :
        msg.delivery_status === "sent" ? "sent" :
        msg.delivery_status === "queued" ? "queued" :
        msg.delivery_status === "failed" || msg.delivery_status === "no_channel" ? "exhausted" :
        "idle";

      return {
        messageId: msg.id,
        state,
        currentChannel: msg.attempted_channel,
        attempts: msg.retry_count || 0,
        nextRetryAt: msg.next_retry_at,
        channelStatuses: {
          whatsapp: { 
            attempted: !!msg.whatsapp_attempted, 
            failed: !!msg.whatsapp_failed_at 
          },
          sms: { 
            attempted: !!msg.sms_attempted, 
            failed: !!msg.sms_failed_at 
          },
          email: { 
            attempted: !!msg.email_attempted, 
            failed: !!msg.email_failed_at 
          },
        },
        isExhausted: msg.delivery_status === "failed" || msg.delivery_status === "no_channel",
      };
    },
    enabled: !!messageId,
    refetchInterval: 10000, // Poll every 10 seconds for status updates
  });
}

// ============================================================================
// MANUAL RETRY HOOK
// ============================================================================

export function useRetryDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      priority = "normal" 
    }: { 
      messageId: string; 
      priority?: keyof typeof RETRY_CONFIGS;
    }) => {
      const config = RETRY_CONFIGS[priority] || DEFAULT_RETRY_CONFIG;

      // Reset message for retry
      const { data, error } = await supabase
        .from("parent_messages")
        .update({
          delivery_status: "queued" as DeliveryStatus,
          retry_count: 0,
          next_retry_at: null,
          whatsapp_attempted: false,
          whatsapp_failed_at: null,
          sms_attempted: false,
          sms_failed_at: null,
          email_attempted: false,
          email_failed_at: null,
          internal_notes: `Manual retry at ${new Date().toISOString()}, priority: ${priority}`,
        })
        .eq("id", messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["message-delivery-status", data.id] });
      queryClient.invalidateQueries({ queryKey: ["queued-messages"] });
      queryClient.invalidateQueries({ queryKey: ["messages-attention"] });
      toast.success("Message queued for retry");
    },
    onError: () => {
      toast.error("Failed to retry message");
    },
  });
}

// ============================================================================
// QUEUE STATS HOOK
// ============================================================================

export interface QueueStats {
  pending: number;
  queued: number;
  processing: number;
  awaitingRetry: number;
  sent: number;
  delivered: number;
  failed: number;
  offlineQueued: number;
}

export function useDeliveryQueueStats(schoolId: string | undefined) {
  const { queueCount } = useOfflineQueue(schoolId);

  return useQuery({
    queryKey: ["delivery-queue-stats", schoolId],
    queryFn: async (): Promise<QueueStats> => {
      if (!schoolId) {
        return {
          pending: 0,
          queued: 0,
          processing: 0,
          awaitingRetry: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
          offlineQueued: queueCount,
        };
      }

      const { data, error } = await supabase
        .from("parent_messages")
        .select("delivery_status, next_retry_at")
        .eq("school_id", schoolId);

      if (error) throw error;

      const stats: QueueStats = {
        pending: 0,
        queued: 0,
        processing: 0,
        awaitingRetry: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        offlineQueued: queueCount,
      };

      data.forEach(msg => {
        if (msg.delivery_status === "queued" && msg.next_retry_at) {
          stats.awaitingRetry++;
        } else {
          switch (msg.delivery_status) {
            case "pending": stats.pending++; break;
            case "queued": stats.queued++; break;
            case "sent": stats.sent++; break;
            case "delivered": stats.delivered++; break;
            case "failed":
            case "no_channel": stats.failed++; break;
          }
        }
      });

      return stats;
    },
    enabled: !!schoolId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ============================================================================
// PROCESSOR HEALTH HOOK (for admin dashboards)
// ============================================================================

export function useProcessorHealth(schoolId?: string) {
  return useQuery({
    queryKey: ["processor-health", schoolId],
    queryFn: async () => {
      const query = supabase
        .from("delivery_processor_state")
        .select("*")
        .order("last_heartbeat_at", { ascending: false })
        .limit(1);

      if (schoolId) {
        query.eq("school_id", schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          isHealthy: true,
          lastHeartbeat: null,
          messagesProcessed: 0,
          messagesFailed: 0,
        };
      }

      const processor = data[0];
      const lastHeartbeat = new Date(processor.last_heartbeat_at);
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      const isStale = Date.now() - lastHeartbeat.getTime() > staleThreshold;

      return {
        isHealthy: processor.is_healthy && !isStale,
        lastHeartbeat: processor.last_heartbeat_at,
        messagesProcessed: processor.messages_processed,
        messagesFailed: processor.messages_failed,
        lastError: processor.last_error,
      };
    },
    refetchInterval: 60000, // Check every minute
  });
}
