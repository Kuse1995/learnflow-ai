/**
 * Parent Preferences Hook
 * 
 * Manages parent communication preferences with:
 * - Admin editing capability when parent is offline
 * - Preference history logging
 * - Decision flow integration
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ParentPreferences, 
  DEFAULT_PREFERENCES,
  PreferredChannel,
} from "@/lib/parent-preferences";
import type { Database } from "@/integrations/supabase/types";

type MessageCategory = Database["public"]["Enums"]["message_category"];

// ============================================================================
// TYPES
// ============================================================================

export interface ParentContactWithPreferences {
  id: string;
  student_id: string;
  parent_name: string;
  relationship: string | null;
  whatsapp_number: string | null;
  sms_number: string | null;
  email: string | null;
  preferred_channel: PreferredChannel | null;
  global_opt_out: boolean | null;
  opt_out_reason: string | null;
  opt_out_at: string | null;
  receives_learning_updates: boolean | null;
  receives_attendance_notices: boolean | null;
  receives_fee_updates: boolean | null;
  receives_announcements: boolean | null;
  receives_emergency: boolean | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  max_messages_per_week: number | null;
  preferences_updated_by: string | null;
  preferences_updated_at: string | null;
}

export interface PreferenceHistoryEntry {
  id: string;
  parent_contact_id: string;
  changed_by: string | null;
  changed_by_role: string;
  change_type: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface PreferenceUpdate {
  preferred_channel?: PreferredChannel;
  global_opt_out?: boolean;
  opt_out_reason?: string;
  receives_learning_updates?: boolean;
  receives_attendance_notices?: boolean;
  receives_fee_updates?: boolean;
  receives_announcements?: boolean;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  max_messages_per_week?: number;
}

// ============================================================================
// HELPER: Convert DB record to preferences object
// ============================================================================

export function toPreferences(contact: ParentContactWithPreferences): ParentPreferences {
  return {
    preferredChannel: contact.preferred_channel ?? DEFAULT_PREFERENCES.preferredChannel,
    globalOptOut: contact.global_opt_out ?? DEFAULT_PREFERENCES.globalOptOut,
    optOutReason: contact.opt_out_reason ?? undefined,
    optOutAt: contact.opt_out_at ?? undefined,
    receivesLearningUpdates: contact.receives_learning_updates ?? DEFAULT_PREFERENCES.receivesLearningUpdates,
    receivesAttendanceNotices: contact.receives_attendance_notices ?? DEFAULT_PREFERENCES.receivesAttendanceNotices,
    receivesFeeUpdates: contact.receives_fee_updates ?? DEFAULT_PREFERENCES.receivesFeeUpdates,
    receivesAnnouncements: contact.receives_announcements ?? DEFAULT_PREFERENCES.receivesAnnouncements,
    receivesEmergency: contact.receives_emergency ?? DEFAULT_PREFERENCES.receivesEmergency,
    quietHoursStart: contact.quiet_hours_start ?? DEFAULT_PREFERENCES.quietHoursStart,
    quietHoursEnd: contact.quiet_hours_end ?? DEFAULT_PREFERENCES.quietHoursEnd,
    maxMessagesPerWeek: contact.max_messages_per_week ?? DEFAULT_PREFERENCES.maxMessagesPerWeek,
    preferencesUpdatedBy: contact.preferences_updated_by ?? undefined,
    preferencesUpdatedAt: contact.preferences_updated_at ?? undefined,
  };
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get preferences for a parent contact
 */
export function useParentPreferences(parentContactId: string | undefined) {
  return useQuery({
    queryKey: ["parent-preferences", parentContactId],
    queryFn: async () => {
      if (!parentContactId) return null;

      const { data, error } = await supabase
        .from("parent_contacts")
        .select("*")
        .eq("id", parentContactId)
        .single();

      if (error) throw error;
      return data as ParentContactWithPreferences;
    },
    enabled: !!parentContactId,
  });
}

/**
 * Get preference history for a parent contact
 */
export function usePreferenceHistory(parentContactId: string | undefined) {
  return useQuery({
    queryKey: ["preference-history", parentContactId],
    queryFn: async () => {
      if (!parentContactId) return [];

      const { data, error } = await supabase
        .from("parent_preference_history")
        .select("*")
        .eq("parent_contact_id", parentContactId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as PreferenceHistoryEntry[];
    },
    enabled: !!parentContactId,
  });
}

/**
 * Update parent preferences (admin capability)
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentContactId,
      updates,
      changedByRole,
      reason,
    }: {
      parentContactId: string;
      updates: PreferenceUpdate;
      changedByRole: "parent" | "teacher" | "admin";
      reason?: string;
    }) => {
      // Get current preferences for history
      const { data: current, error: fetchError } = await supabase
        .from("parent_contacts")
        .select("*")
        .eq("id", parentContactId)
        .single();

      if (fetchError) throw fetchError;

      // Determine change type
      let changeType = "category_change";
      if (updates.preferred_channel !== undefined) {
        changeType = "channel_change";
      } else if (updates.global_opt_out === true) {
        changeType = "opt_out";
      } else if (updates.global_opt_out === false && current.global_opt_out) {
        changeType = "opt_in";
      }

      // Build update object
      const updateData: Record<string, unknown> = { ...updates };
      
      // Handle opt-out timestamp
      if (updates.global_opt_out === true) {
        updateData.opt_out_at = new Date().toISOString();
        updateData.opt_out_reason = reason;
      } else if (updates.global_opt_out === false) {
        updateData.opt_out_at = null;
        updateData.opt_out_reason = null;
      }

      // Update preferences
      const { data, error } = await supabase
        .from("parent_contacts")
        .update(updateData)
        .eq("id", parentContactId)
        .select()
        .single();

      if (error) throw error;

      // Log preference change via RPC
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const previousValue = JSON.parse(JSON.stringify({
        preferred_channel: current.preferred_channel,
        global_opt_out: current.global_opt_out,
        receives_learning_updates: current.receives_learning_updates,
        receives_attendance_notices: current.receives_attendance_notices,
        receives_fee_updates: current.receives_fee_updates,
        receives_announcements: current.receives_announcements,
      }));
      const newValue = JSON.parse(JSON.stringify(updates));
      
      await supabase.rpc("log_preference_change", {
        p_parent_contact_id: parentContactId,
        p_changed_by: userId,
        p_changed_by_role: changedByRole,
        p_change_type: changeType,
        p_previous_value: previousValue,
        p_new_value: newValue,
        p_reason: reason,
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parent-preferences", data.id] });
      queryClient.invalidateQueries({ queryKey: ["preference-history", data.id] });
      queryClient.invalidateQueries({ queryKey: ["parent-contacts", data.student_id] });
      toast.success("Preferences updated");
    },
    onError: () => {
      toast.error("Could not update preferences");
    },
  });
}

/**
 * Set global opt-out
 */
export function useOptOut() {
  const updateMutation = useUpdatePreferences();

  return useMutation({
    mutationFn: async ({
      parentContactId,
      optOut,
      reason,
      changedByRole,
    }: {
      parentContactId: string;
      optOut: boolean;
      reason?: string;
      changedByRole: "parent" | "teacher" | "admin";
    }) => {
      return updateMutation.mutateAsync({
        parentContactId,
        updates: { global_opt_out: optOut },
        changedByRole,
        reason,
      });
    },
  });
}

/**
 * Check if message can be sent to parent (uses DB function)
 */
export function useCanSendToParent() {
  return useMutation({
    mutationFn: async ({
      parentContactId,
      category,
      isEmergency = false,
    }: {
      parentContactId: string;
      category: MessageCategory;
      isEmergency?: boolean;
    }) => {
      const { data, error } = await supabase.rpc("can_send_to_parent", {
        p_parent_contact_id: parentContactId,
        p_category: category,
        p_is_emergency: isEmergency,
      });

      if (error) throw error;
      return data as {
        allowed: boolean;
        channel?: string;
        reason?: string;
        emergency_override?: boolean;
      };
    },
  });
}
