/**
 * Notification Trigger Rules
 * 
 * CORE PRINCIPLE: Manual-first communication
 * - No automatic sending except emergencies
 * - Teachers/admins must explicitly approve
 * - Parents can opt out of any category
 */

import type { Database } from "@/integrations/supabase/types";

type MessageCategory = Database["public"]["Enums"]["message_category"];
type DeliveryChannel = Database["public"]["Enums"]["delivery_channel"];

// ============================================================================
// TRIGGER TYPES
// ============================================================================

export type NotificationEvent =
  | "parent_insight_approved"
  | "adaptive_support_plan_acknowledged"
  | "attendance_marked_absent"
  | "fee_status_updated"
  | "general_announcement"
  | "emergency_notice"
  | "term_report_ready"
  | "practice_session_completed";

export interface NotificationTrigger {
  event: NotificationEvent;
  category: MessageCategory;
  requiresApproval: boolean;
  defaultEnabled: boolean; // DEFAULT OFF for most
  defaultChannel: DeliveryChannel;
  optionalChannels: DeliveryChannel[];
  canBeDisabledByParent: boolean;
  autoSend: boolean; // Only true for emergencies
  description: string;
  approvalFlow: "none" | "teacher" | "admin" | "teacher_then_admin";
}

// ============================================================================
// TRIGGER MATRIX
// ============================================================================

export const NOTIFICATION_TRIGGERS: Record<NotificationEvent, NotificationTrigger> = {
  // Learning update - teacher approved insight ready to share
  parent_insight_approved: {
    event: "parent_insight_approved",
    category: "learning_update",
    requiresApproval: true,
    defaultEnabled: false, // DEFAULT OFF - teacher must enable
    defaultChannel: "whatsapp",
    optionalChannels: ["sms", "email"],
    canBeDisabledByParent: true,
    autoSend: false, // NEVER auto-send
    description: "Send approved learning insight to parent",
    approvalFlow: "teacher",
  },

  // Support plan acknowledged by teacher
  adaptive_support_plan_acknowledged: {
    event: "adaptive_support_plan_acknowledged",
    category: "learning_update",
    requiresApproval: true,
    defaultEnabled: false, // DEFAULT OFF
    defaultChannel: "whatsapp",
    optionalChannels: ["sms", "email"],
    canBeDisabledByParent: true,
    autoSend: false,
    description: "Notify parent of new support strategies",
    approvalFlow: "teacher",
  },

  // Attendance - informational only
  attendance_marked_absent: {
    event: "attendance_marked_absent",
    category: "attendance_notice",
    requiresApproval: false, // Factual, no approval needed
    defaultEnabled: false, // DEFAULT OFF - school must enable
    defaultChannel: "sms", // SMS for quick delivery
    optionalChannels: ["whatsapp"],
    canBeDisabledByParent: true,
    autoSend: false, // Still requires manual trigger
    description: "Inform parent of absence (factual only)",
    approvalFlow: "none",
  },

  // Fee status - HIGHLY RESTRICTED
  fee_status_updated: {
    event: "fee_status_updated",
    category: "fee_status",
    requiresApproval: true, // ALWAYS requires approval
    defaultEnabled: false, // DEFAULT OFF - opt-in only
    defaultChannel: "whatsapp",
    optionalChannels: ["sms", "email"],
    canBeDisabledByParent: true, // Parents can always opt out
    autoSend: false, // NEVER auto-send fee notices
    description: "Routine account information (neutral language only)",
    approvalFlow: "admin", // Only admin can send
  },

  // General announcements
  general_announcement: {
    event: "general_announcement",
    category: "school_announcement",
    requiresApproval: true,
    defaultEnabled: true, // Parents expect announcements
    defaultChannel: "whatsapp",
    optionalChannels: ["sms", "email"],
    canBeDisabledByParent: true,
    autoSend: false,
    description: "School-wide or class announcements",
    approvalFlow: "admin",
  },

  // Emergency - ONLY auto-send category
  emergency_notice: {
    event: "emergency_notice",
    category: "emergency_notice",
    requiresApproval: false, // Speed is critical
    defaultEnabled: true, // Always enabled
    defaultChannel: "sms", // Most reliable for emergencies
    optionalChannels: ["whatsapp", "email"],
    canBeDisabledByParent: false, // Cannot opt out of emergencies
    autoSend: true, // ONLY category that auto-sends
    description: "Critical safety or emergency information",
    approvalFlow: "none",
  },

  // Term report ready
  term_report_ready: {
    event: "term_report_ready",
    category: "learning_update",
    requiresApproval: true,
    defaultEnabled: false, // DEFAULT OFF
    defaultChannel: "whatsapp",
    optionalChannels: ["sms", "email"],
    canBeDisabledByParent: true,
    autoSend: false,
    description: "Notify parent that term report is available",
    approvalFlow: "teacher_then_admin",
  },

  // Practice session completed (student portal)
  practice_session_completed: {
    event: "practice_session_completed",
    category: "learning_update",
    requiresApproval: true,
    defaultEnabled: false, // DEFAULT OFF
    defaultChannel: "whatsapp",
    optionalChannels: ["sms"],
    canBeDisabledByParent: true,
    autoSend: false,
    description: "Share practice activity summary with parent",
    approvalFlow: "teacher",
  },
};

// ============================================================================
// APPROVAL FLOW DEFINITIONS
// ============================================================================

export interface ApprovalStep {
  role: "teacher" | "admin";
  action: "approve" | "review" | "send";
  required: boolean;
}

export const APPROVAL_FLOWS: Record<NotificationTrigger["approvalFlow"], ApprovalStep[]> = {
  none: [],

  teacher: [
    { role: "teacher", action: "approve", required: true },
  ],

  admin: [
    { role: "admin", action: "approve", required: true },
  ],

  teacher_then_admin: [
    { role: "teacher", action: "review", required: true },
    { role: "admin", action: "approve", required: true },
  ],
};

// ============================================================================
// DEFAULT OFF BEHAVIOR
// ============================================================================

export const DEFAULT_OFF_RULES = {
  // Core principle
  principle: "All notifications are OFF by default except emergencies",

  // What this means
  implications: [
    "Schools must explicitly enable each notification type",
    "Teachers must manually trigger sends (no automation)",
    "Parents must opt-in for fee-related messages",
    "No silent background notifications",
  ],

  // Exceptions
  exceptions: [
    "Emergency notices are always enabled",
    "General announcements default ON (expected by parents)",
  ],

  // Activation requirements
  activation: {
    school_level: "Admin must enable notification category for school",
    teacher_level: "Teacher must manually initiate send",
    parent_level: "Parent preferences respected (opt-out honored)",
  },
} as const;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a notification can be sent for an event
 */
export function canSendNotification(
  event: NotificationEvent,
  schoolEnabled: boolean,
  parentOptedIn: boolean
): { allowed: boolean; reason?: string } {
  const trigger = NOTIFICATION_TRIGGERS[event];

  // Emergency always allowed
  if (event === "emergency_notice") {
    return { allowed: true };
  }

  // Check school-level setting
  if (!schoolEnabled && !trigger.defaultEnabled) {
    return { allowed: false, reason: "Notification type not enabled for school" };
  }

  // Check parent preference
  if (trigger.canBeDisabledByParent && !parentOptedIn) {
    return { allowed: false, reason: "Parent has opted out of this notification type" };
  }

  return { allowed: true };
}

/**
 * Check if notification requires approval before sending
 */
export function requiresApprovalBefore(event: NotificationEvent): boolean {
  return NOTIFICATION_TRIGGERS[event].requiresApproval;
}

/**
 * Get the approval flow for an event
 */
export function getApprovalFlow(event: NotificationEvent): ApprovalStep[] {
  const trigger = NOTIFICATION_TRIGGERS[event];
  return APPROVAL_FLOWS[trigger.approvalFlow];
}

/**
 * Check if event can auto-send (only emergencies)
 */
export function canAutoSend(event: NotificationEvent): boolean {
  return NOTIFICATION_TRIGGERS[event].autoSend;
}

/**
 * Get default channel for an event
 */
export function getDefaultChannel(event: NotificationEvent): DeliveryChannel {
  return NOTIFICATION_TRIGGERS[event].defaultChannel;
}

// ============================================================================
// TRIGGER MATRIX SUMMARY (for documentation/UI)
// ============================================================================

export const TRIGGER_MATRIX_SUMMARY = [
  {
    event: "Parent Insight Approved",
    requiresApproval: "Yes (Teacher)",
    defaultChannel: "WhatsApp",
    optionalChannels: "SMS, Email",
    canDisable: "Yes",
    autoSend: "No",
  },
  {
    event: "Support Plan Acknowledged",
    requiresApproval: "Yes (Teacher)",
    defaultChannel: "WhatsApp",
    optionalChannels: "SMS, Email",
    canDisable: "Yes",
    autoSend: "No",
  },
  {
    event: "Attendance Marked Absent",
    requiresApproval: "No",
    defaultChannel: "SMS",
    optionalChannels: "WhatsApp",
    canDisable: "Yes",
    autoSend: "No",
  },
  {
    event: "Fee Status Updated",
    requiresApproval: "Yes (Admin)",
    defaultChannel: "WhatsApp",
    optionalChannels: "SMS, Email",
    canDisable: "Yes",
    autoSend: "No",
  },
  {
    event: "General Announcement",
    requiresApproval: "Yes (Admin)",
    defaultChannel: "WhatsApp",
    optionalChannels: "SMS, Email",
    canDisable: "Yes",
    autoSend: "No",
  },
  {
    event: "Emergency Notice",
    requiresApproval: "No",
    defaultChannel: "SMS",
    optionalChannels: "WhatsApp, Email",
    canDisable: "No",
    autoSend: "Yes (only)",
  },
  {
    event: "Term Report Ready",
    requiresApproval: "Yes (Teacher → Admin)",
    defaultChannel: "WhatsApp",
    optionalChannels: "SMS, Email",
    canDisable: "Yes",
    autoSend: "No",
  },
  {
    event: "Practice Session Completed",
    requiresApproval: "Yes (Teacher)",
    defaultChannel: "WhatsApp",
    optionalChannels: "SMS",
    canDisable: "Yes",
    autoSend: "No",
  },
] as const;
