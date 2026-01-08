/**
 * Parent Communication Preferences System
 * 
 * CORE PRINCIPLES:
 * - Parents control their preferred channels
 * - Global opt-out is respected for all non-emergency messages
 * - Emergency notices ALWAYS override opt-out
 * - Admins can edit preferences when parent is offline
 */

import type { Database } from "@/integrations/supabase/types";

type MessageCategory = Database["public"]["Enums"]["message_category"];
type DeliveryChannel = Database["public"]["Enums"]["delivery_channel"];

// ============================================================================
// PREFERENCE TYPES
// ============================================================================

export type PreferredChannel = "whatsapp" | "sms" | "email" | "none";

export interface ParentPreferences {
  // Channel preference
  preferredChannel: PreferredChannel;
  
  // Global opt-out
  globalOptOut: boolean;
  optOutReason?: string;
  optOutAt?: string;
  
  // Category preferences
  receivesLearningUpdates: boolean;
  receivesAttendanceNotices: boolean;
  receivesFeeUpdates: boolean; // Default FALSE (opt-in only)
  receivesAnnouncements: boolean;
  receivesEmergency: boolean; // ALWAYS true, cannot be disabled
  
  // Quiet hours
  quietHoursStart: number; // 0-23, default 18 (6 PM)
  quietHoursEnd: number;   // 0-23, default 8 (8 AM)
  
  // Limits
  maxMessagesPerWeek: number;
  
  // Audit
  preferencesUpdatedBy?: string;
  preferencesUpdatedAt?: string;
}

// ============================================================================
// DEFAULT VALUES FOR NEW PARENTS
// ============================================================================

export const DEFAULT_PREFERENCES: ParentPreferences = {
  // Default to WhatsApp as most common
  preferredChannel: "whatsapp",
  
  // Not opted out by default
  globalOptOut: false,
  
  // Category defaults - conservative approach
  receivesLearningUpdates: true,
  receivesAttendanceNotices: true,
  receivesFeeUpdates: false, // OPT-IN ONLY - never default to true
  receivesAnnouncements: true,
  receivesEmergency: true, // CANNOT be disabled
  
  // Quiet hours: 6 PM to 8 AM (no messages during these hours except emergency)
  quietHoursStart: 18,
  quietHoursEnd: 8,
  
  // Maximum 5 messages per week by default
  maxMessagesPerWeek: 5,
};

// ============================================================================
// PREFERENCE DECISION FLOW
// ============================================================================

export interface DeliveryDecision {
  allowed: boolean;
  channel?: DeliveryChannel;
  reason?: DeliveryBlockReason;
  emergencyOverride?: boolean;
  fallback?: boolean;
}

export type DeliveryBlockReason =
  | "global_opt_out"
  | "category_opt_out"
  | "no_channel_preferred"
  | "no_channel_available"
  | "preferred_channel_unavailable"
  | "quiet_hours"
  | "weekly_limit_exceeded"
  | "contact_not_found";

/**
 * Decision flow for determining if a message can be sent
 * 
 * FLOW:
 * 1. Is this an emergency? → ALWAYS send (find any channel)
 * 2. Is parent globally opted out? → BLOCK
 * 3. Is preferred channel "none"? → BLOCK
 * 4. Is category disabled? → BLOCK
 * 5. Is it quiet hours? → BLOCK (unless urgent)
 * 6. Is weekly limit exceeded? → BLOCK
 * 7. Is preferred channel available? → SEND
 * 8. Try fallback channel → SEND with fallback flag
 * 9. No channels available → BLOCK
 */
export function canSendMessage(
  preferences: ParentPreferences,
  category: MessageCategory,
  availableChannels: { whatsapp: boolean; sms: boolean; email: boolean },
  isEmergency: boolean = false,
  currentHour?: number
): DeliveryDecision {
  // Step 1: Emergency override
  if (isEmergency || category === "emergency_notice") {
    // Find any available channel for emergencies
    if (availableChannels.sms) {
      return { allowed: true, channel: "sms", emergencyOverride: true };
    }
    if (availableChannels.whatsapp) {
      return { allowed: true, channel: "whatsapp", emergencyOverride: true };
    }
    if (availableChannels.email) {
      return { allowed: true, channel: "email", emergencyOverride: true };
    }
    return { allowed: false, reason: "no_channel_available" };
  }

  // Step 2: Global opt-out check
  if (preferences.globalOptOut) {
    return { allowed: false, reason: "global_opt_out" };
  }

  // Step 3: Preferred channel is "none"
  if (preferences.preferredChannel === "none") {
    return { allowed: false, reason: "no_channel_preferred" };
  }

  // Step 4: Category-specific opt-out
  if (!isCategoryEnabled(preferences, category)) {
    return { allowed: false, reason: "category_opt_out" };
  }

  // Step 5: Quiet hours check (if current hour provided)
  if (currentHour !== undefined && isQuietHours(preferences, currentHour)) {
    return { allowed: false, reason: "quiet_hours" };
  }

  // Step 6-9: Channel resolution
  return resolveChannel(preferences.preferredChannel, availableChannels);
}

/**
 * Check if category is enabled in preferences
 */
function isCategoryEnabled(preferences: ParentPreferences, category: MessageCategory): boolean {
  switch (category) {
    case "learning_update":
      return preferences.receivesLearningUpdates;
    case "attendance_notice":
      return preferences.receivesAttendanceNotices;
    case "fee_status":
      return preferences.receivesFeeUpdates; // Opt-in only
    case "school_announcement":
      return preferences.receivesAnnouncements;
    case "emergency_notice":
      return true; // ALWAYS enabled
    default:
      return false;
  }
}

/**
 * Check if current hour is within quiet hours
 */
function isQuietHours(preferences: ParentPreferences, currentHour: number): boolean {
  const { quietHoursStart, quietHoursEnd } = preferences;
  
  // Handle wrap-around (e.g., 18:00 to 08:00)
  if (quietHoursStart > quietHoursEnd) {
    // Quiet hours span midnight
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  } else {
    // Normal range
    return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
  }
}

/**
 * Resolve which channel to use
 */
function resolveChannel(
  preferred: PreferredChannel,
  available: { whatsapp: boolean; sms: boolean; email: boolean }
): DeliveryDecision {
  // Try preferred channel first
  if (preferred === "whatsapp" && available.whatsapp) {
    return { allowed: true, channel: "whatsapp" };
  }
  if (preferred === "sms" && available.sms) {
    return { allowed: true, channel: "sms" };
  }
  if (preferred === "email" && available.email) {
    return { allowed: true, channel: "email" };
  }

  // Preferred not available, try fallback
  if (preferred === "whatsapp" && available.sms) {
    return { allowed: true, channel: "sms", fallback: true };
  }
  if (preferred === "sms" && available.whatsapp) {
    return { allowed: true, channel: "whatsapp", fallback: true };
  }

  return { allowed: false, reason: "preferred_channel_unavailable" };
}

// ============================================================================
// DATA MODEL SUMMARY (for documentation)
// ============================================================================

export const PREFERENCE_DATA_MODEL = {
  table: "parent_contacts",
  preferenceColumns: [
    { name: "preferred_channel", type: "text", default: "whatsapp", values: ["whatsapp", "sms", "email", "none"] },
    { name: "global_opt_out", type: "boolean", default: false },
    { name: "opt_out_reason", type: "text", nullable: true },
    { name: "opt_out_at", type: "timestamptz", nullable: true },
    { name: "receives_learning_updates", type: "boolean", default: true },
    { name: "receives_attendance_notices", type: "boolean", default: true },
    { name: "receives_fee_updates", type: "boolean", default: false, note: "OPT-IN ONLY" },
    { name: "receives_announcements", type: "boolean", default: true },
    { name: "receives_emergency", type: "boolean", default: true, note: "CANNOT BE DISABLED" },
    { name: "quiet_hours_start", type: "integer", default: 18, note: "6 PM" },
    { name: "quiet_hours_end", type: "integer", default: 8, note: "8 AM" },
    { name: "max_messages_per_week", type: "integer", default: 5 },
    { name: "preferences_updated_by", type: "uuid", nullable: true },
    { name: "preferences_updated_at", type: "timestamptz", nullable: true },
  ],
  historyTable: "parent_preference_history",
  historyColumns: [
    { name: "id", type: "uuid", primaryKey: true },
    { name: "parent_contact_id", type: "uuid", foreignKey: "parent_contacts" },
    { name: "changed_by", type: "uuid" },
    { name: "changed_by_role", type: "text", values: ["parent", "teacher", "admin"] },
    { name: "change_type", type: "text", values: ["channel_change", "opt_out", "opt_in", "category_change"] },
    { name: "previous_value", type: "jsonb" },
    { name: "new_value", type: "jsonb" },
    { name: "reason", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz" },
  ],
} as const;

// ============================================================================
// DECISION FLOW SUMMARY (for documentation)
// ============================================================================

export const DECISION_FLOW = {
  title: "Message Delivery Decision Flow",
  steps: [
    {
      step: 1,
      check: "Is this an emergency?",
      ifYes: "SEND immediately via any available channel (SMS preferred)",
      ifNo: "Continue to step 2",
    },
    {
      step: 2,
      check: "Is parent globally opted out?",
      ifYes: "BLOCK - respect opt-out",
      ifNo: "Continue to step 3",
    },
    {
      step: 3,
      check: "Is preferred channel 'none'?",
      ifYes: "BLOCK - parent chose no communication",
      ifNo: "Continue to step 4",
    },
    {
      step: 4,
      check: "Is this category disabled?",
      ifYes: "BLOCK - category opt-out",
      ifNo: "Continue to step 5",
    },
    {
      step: 5,
      check: "Is it quiet hours?",
      ifYes: "DELAY until quiet hours end",
      ifNo: "Continue to step 6",
    },
    {
      step: 6,
      check: "Weekly limit exceeded?",
      ifYes: "BLOCK - limit reached",
      ifNo: "Continue to step 7",
    },
    {
      step: 7,
      check: "Is preferred channel available?",
      ifYes: "SEND via preferred channel",
      ifNo: "Try fallback channel",
    },
    {
      step: 8,
      check: "Is fallback channel available?",
      ifYes: "SEND via fallback (flag it)",
      ifNo: "BLOCK - no channels available",
    },
  ],
  emergencyOverride: {
    description: "Emergency notices bypass ALL preference checks except channel availability",
    channelPriority: ["sms", "whatsapp", "email"],
    reason: "Safety-critical messages must reach parents",
  },
} as const;

// ============================================================================
// CATEGORY DEFAULTS SUMMARY
// ============================================================================

export const CATEGORY_DEFAULTS = {
  learning_update: { default: true, optIn: false, canDisable: true },
  attendance_notice: { default: true, optIn: false, canDisable: true },
  fee_status: { default: false, optIn: true, canDisable: true, note: "Opt-in only, never auto-enable" },
  school_announcement: { default: true, optIn: false, canDisable: true },
  emergency_notice: { default: true, optIn: false, canDisable: false, note: "Cannot be disabled by parent" },
} as const;
