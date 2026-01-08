/**
 * Message Queue Hook
 * 
 * Provides offline-aware message queue management with:
 * - State machine transitions
 * - Manual resend capability
 * - Admin visibility rules
 * - Internal-only failure tracking
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MessageState,
  getStateFromStatus,
  getStatusLabel,
  canResend,
  getAdminVisibility,
  UserRole,
  STATUS_BADGE_VARIANTS,
  StatusBadgeVariant,
} from "@/lib/message-queue-system";
import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];
type DeliveryChannel = Database["public"]["Enums"]["delivery_channel"];

// ============================================================================
// QUEUE ITEM TYPE
// ============================================================================

export interface QueueItem {
  id: string;
  message_id: string;
  channel: DeliveryChannel;
  priority_level: number;
  scheduled_for: string;
  attempts: number | null;
  max_attempts: number | null;
  last_error: string | null; // INTERNAL ONLY
  processed_at: string | null;
  created_at: string;
}

export interface MessageWithQueueInfo {
  id: string;
  message_body: string;
  category: string;
  delivery_status: DeliveryStatus;
  state: MessageState;
  label: string;
  badgeVariant: StatusBadgeVariant;
  created_at: string;
  student_id: string;
  parent_contact_id: string;
  // Channel attempt tracking
  whatsapp_attempted: boolean | null;
  whatsapp_failed_at: string | null;
  sms_attempted: boolean | null;
  sms_failed_at: string | null;
  email_attempted: boolean | null;
  email_failed_at: string | null;
  // Admin-only fields
  internal_notes?: string | null;
  retry_count: number | null;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get queued messages for a school
 */
export function useQueuedMessages(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["queued-messages", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from("parent_messages")
        .select("*")
        .eq("school_id", schoolId)
        .in("delivery_status", ["pending", "queued"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });
}

/**
 * Get messages requiring attention (failed or no_channel)
 */
export function useMessagesRequiringAttention(schoolId: string | undefined, role: UserRole) {
  return useQuery({
    queryKey: ["messages-attention", schoolId, role],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from("parent_messages")
        .select("*")
        .eq("school_id", schoolId)
        .in("delivery_status", ["failed", "no_channel"])
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Transform with role-appropriate visibility
      return data.map((msg): MessageWithQueueInfo => {
        const state = getStateFromStatus(msg.delivery_status);
        return {
          id: msg.id,
          message_body: msg.message_body,
          category: msg.category,
          delivery_status: msg.delivery_status,
          state,
          label: getStatusLabel(state, role),
          badgeVariant: STATUS_BADGE_VARIANTS[state],
          created_at: msg.created_at,
          student_id: msg.student_id,
          parent_contact_id: msg.parent_contact_id,
          whatsapp_attempted: msg.whatsapp_attempted,
          whatsapp_failed_at: msg.whatsapp_failed_at,
          sms_attempted: msg.sms_attempted,
          sms_failed_at: msg.sms_failed_at,
          email_attempted: msg.email_attempted,
          email_failed_at: msg.email_failed_at,
          // Only include internal notes for admins
          internal_notes: role !== "teacher" ? msg.internal_notes : null,
          retry_count: msg.retry_count,
        };
      });
    },
    enabled: !!schoolId,
  });
}

/**
 * Manual resend mutation (admin only)
 */
export function useManualResend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      role 
    }: { 
      messageId: string; 
      role: UserRole;
    }) => {
      // Verify permission
      const visibility = getAdminVisibility(role, "failed");
      if (!visibility.canManualResend) {
        throw new Error("Not authorized to resend messages");
      }

      // Reset message for redelivery
      const { data, error } = await supabase
        .from("parent_messages")
        .update({
          delivery_status: "queued" as DeliveryStatus,
          retry_count: 0,
          internal_notes: `Manual resend initiated at ${new Date().toISOString()}`,
          // Reset channel attempt flags
          whatsapp_attempted: false,
          whatsapp_failed_at: null,
          sms_attempted: false,
          sms_failed_at: null,
          email_attempted: false,
          email_failed_at: null,
          first_attempt_at: null,
          last_attempt_at: null,
        })
        .eq("id", messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages-attention"] });
      queryClient.invalidateQueries({ queryKey: ["queued-messages"] });
      queryClient.invalidateQueries({ queryKey: ["parent-messages", data.student_id] });
      toast.success("Message queued for redelivery");
    },
    onError: () => {
      toast.error("Could not queue message");
    },
  });
}

/**
 * Cancel a pending/draft message
 */
export function useCancelMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      role 
    }: { 
      messageId: string; 
      role: UserRole;
    }) => {
      // Get current message state
      const { data: msg, error: fetchError } = await supabase
        .from("parent_messages")
        .select("delivery_status, student_id")
        .eq("id", messageId)
        .single();

      if (fetchError) throw fetchError;

      const state = getStateFromStatus(msg.delivery_status);
      const visibility = getAdminVisibility(role, state);
      
      if (!visibility.canCancelMessage) {
        throw new Error("Cannot cancel message in current state");
      }

      // Mark as cancelled (using failed status with internal note)
      const { data, error } = await supabase
        .from("parent_messages")
        .update({
          delivery_status: "failed" as DeliveryStatus,
          internal_notes: `Cancelled by ${role} at ${new Date().toISOString()}`,
        })
        .eq("id", messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["queued-messages"] });
      queryClient.invalidateQueries({ queryKey: ["parent-messages", data.student_id] });
      toast.success("Message cancelled");
    },
    onError: () => {
      toast.error("Could not cancel message");
    },
  });
}

/**
 * Get queue statistics for dashboard
 */
export function useQueueStats(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["queue-stats", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from("parent_messages")
        .select("delivery_status")
        .eq("school_id", schoolId);

      if (error) throw error;

      const stats = {
        draft: 0,
        pending: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        requiresAttention: 0, // Combined failed + no_channel
        total: data.length,
      };

      data.forEach((msg) => {
        switch (msg.delivery_status) {
          case "pending":
            stats.pending++;
            break;
          case "queued":
            stats.queued++;
            break;
          case "sent":
            stats.sent++;
            break;
          case "delivered":
            stats.delivered++;
            break;
          case "failed":
          case "no_channel":
            stats.requiresAttention++;
            break;
        }
      });

      return stats;
    },
    enabled: !!schoolId,
  });
}
