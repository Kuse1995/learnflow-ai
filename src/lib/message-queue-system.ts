/**
 * Offline-Aware Message Queue System
 * 
 * CORE PRINCIPLES:
 * - All failure reasons are INTERNAL ONLY
 * - Parents NEVER see delivery failures
 * - Teachers see neutral "Pending delivery" status
 * - Maximum 1 retry per channel
 * - Silent failure handling
 */

import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];
type DeliveryChannel = Database["public"]["Enums"]["delivery_channel"];

// ============================================================================
// MESSAGE STATES
// ============================================================================

export type MessageState = 
  | "draft"      // Created but not submitted
  | "pending"    // Awaiting approval
  | "approved"   // Approved, ready to queue
  | "queued"     // In delivery queue
  | "sending"    // Currently being sent
  | "sent"       // Sent successfully
  | "delivered"  // Confirmed delivered
  | "failed";    // Failed (internal only)

// Maps database status to our state machine
export const STATUS_TO_STATE: Record<DeliveryStatus, MessageState> = {
  pending: "pending",
  queued: "queued",
  sent: "sent",
  delivered: "delivered",
  failed: "failed",
  no_channel: "failed",
};

// ============================================================================
// STATE MACHINE TRANSITIONS
// ============================================================================

export interface StateTransition {
  from: MessageState;
  to: MessageState;
  trigger: string;
  requiresAuth: boolean;
}

export const STATE_MACHINE: StateTransition[] = [
  // Draft → Pending (submit for approval)
  { from: "draft", to: "pending", trigger: "submit_for_approval", requiresAuth: true },
  
  // Draft → Queued (direct send, no approval needed)
  { from: "draft", to: "queued", trigger: "queue_direct", requiresAuth: true },
  
  // Pending → Approved (teacher/admin approves)
  { from: "pending", to: "approved", trigger: "approve", requiresAuth: true },
  
  // Pending → Failed (rejected - internal only)
  { from: "pending", to: "failed", trigger: "reject", requiresAuth: true },
  
  // Approved → Queued (automatically queued after approval)
  { from: "approved", to: "queued", trigger: "auto_queue", requiresAuth: false },
  
  // Queued → Sending (picked up by delivery processor)
  { from: "queued", to: "sending", trigger: "start_send", requiresAuth: false },
  
  // Sending → Sent (delivery succeeded)
  { from: "sending", to: "sent", trigger: "send_success", requiresAuth: false },
  
  // Sending → Failed (delivery failed - INTERNAL ONLY)
  { from: "sending", to: "failed", trigger: "send_failure", requiresAuth: false },
  
  // Sent → Delivered (delivery confirmed)
  { from: "sent", to: "delivered", trigger: "confirm_delivery", requiresAuth: false },
  
  // Failed → Queued (manual resend by admin)
  { from: "failed", to: "queued", trigger: "manual_resend", requiresAuth: true },
];

export function canTransition(from: MessageState, to: MessageState): boolean {
  return STATE_MACHINE.some(t => t.from === from && t.to === to);
}

export function getAvailableTransitions(currentState: MessageState): StateTransition[] {
  return STATE_MACHINE.filter(t => t.from === currentState);
}

// ============================================================================
// UI STATUS LABELS (User-facing - neutral language)
// ============================================================================

// Labels shown to TEACHERS (slightly more detail, still neutral)
export const TEACHER_STATUS_LABELS: Record<MessageState, string> = {
  draft: "Draft",
  pending: "Awaiting Approval",
  approved: "Approved",
  queued: "Pending Delivery",
  sending: "Pending Delivery",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Pending Delivery", // NEVER show "failed" to teachers
};

// Labels shown to ADMINS (internal, more detail)
export const ADMIN_STATUS_LABELS: Record<MessageState, string> = {
  draft: "Draft",
  pending: "Awaiting Approval",
  approved: "Approved",
  queued: "In Queue",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Requires Attention", // Neutral even for admins
};

// Labels shown to PLATFORM ADMINS (full visibility)
export const PLATFORM_ADMIN_STATUS_LABELS: Record<MessageState, string> = {
  draft: "Draft",
  pending: "Awaiting Approval",
  approved: "Approved",
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed - Internal",
};

// Badge variants for UI
export type StatusBadgeVariant = "default" | "secondary" | "outline" | "destructive";

export const STATUS_BADGE_VARIANTS: Record<MessageState, StatusBadgeVariant> = {
  draft: "outline",
  pending: "secondary",
  approved: "secondary",
  queued: "secondary",
  sending: "secondary",
  sent: "default",
  delivered: "default",
  failed: "secondary", // NOT destructive - keep it neutral
};

// ============================================================================
// DELIVERY ATTEMPT LOGIC
// ============================================================================

export interface DeliveryAttempt {
  channel: DeliveryChannel;
  attemptedAt: string;
  succeeded: boolean;
  errorCode?: string; // INTERNAL ONLY
  errorMessage?: string; // INTERNAL ONLY
}

export interface DeliveryRecord {
  messageId: string;
  attempts: DeliveryAttempt[];
  currentChannel: DeliveryChannel | null;
  maxRetriesPerChannel: 1; // ALWAYS 1
  totalAttempts: number;
  finalStatus: MessageState;
}

// Max 1 retry per channel
export const MAX_RETRIES_PER_CHANNEL = 1;

// Channel fallback order
export const CHANNEL_PRIORITY: DeliveryChannel[] = ["whatsapp", "sms", "email"];

export interface ChannelAttemptStatus {
  whatsapp: { attempted: boolean; failed: boolean; canRetry: boolean };
  sms: { attempted: boolean; failed: boolean; canRetry: boolean };
  email: { attempted: boolean; failed: boolean; canRetry: boolean };
}

export function getChannelAttemptStatus(
  whatsappAttempted: boolean,
  whatsappFailed: boolean,
  smsAttempted: boolean,
  smsFailed: boolean,
  emailAttempted: boolean,
  emailFailed: boolean
): ChannelAttemptStatus {
  return {
    whatsapp: {
      attempted: whatsappAttempted,
      failed: whatsappFailed,
      canRetry: whatsappAttempted && whatsappFailed, // Can retry once if failed
    },
    sms: {
      attempted: smsAttempted,
      failed: smsFailed,
      canRetry: smsAttempted && smsFailed,
    },
    email: {
      attempted: emailAttempted,
      failed: emailFailed,
      canRetry: emailAttempted && emailFailed,
    },
  };
}

/**
 * Determine next channel to try based on attempts and availability
 */
export function getNextChannel(
  status: ChannelAttemptStatus,
  availableChannels: DeliveryChannel[]
): DeliveryChannel | null {
  for (const channel of CHANNEL_PRIORITY) {
    if (!availableChannels.includes(channel)) continue;
    
    const channelStatus = status[channel];
    
    // If not attempted yet, try this channel
    if (!channelStatus.attempted) {
      return channel;
    }
    
    // If attempted but can retry (max 1 retry), allow retry
    if (channelStatus.canRetry) {
      return channel;
    }
  }
  
  // All channels exhausted
  return null;
}

/**
 * Check if all delivery options are exhausted
 */
export function isDeliveryExhausted(
  status: ChannelAttemptStatus,
  availableChannels: DeliveryChannel[]
): boolean {
  return availableChannels.every(channel => {
    const s = status[channel];
    // Channel is exhausted if: attempted and (succeeded OR failed without retry option)
    return s.attempted && (!s.failed || !s.canRetry);
  });
}

// ============================================================================
// INTERNAL FAILURE REASONS (NEVER SHOWN TO PARENTS)
// ============================================================================

export type InternalFailureReason =
  | "channel_unavailable"
  | "rate_limited"
  | "invalid_number"
  | "network_error"
  | "provider_error"
  | "timeout"
  | "rejected_by_recipient"
  | "content_blocked"
  | "unknown";

export const FAILURE_REASONS: Record<InternalFailureReason, {
  code: string;
  description: string; // For internal logging only
  retryable: boolean;
}> = {
  channel_unavailable: {
    code: "CH_UNAVAIL",
    description: "Channel not configured for recipient",
    retryable: false,
  },
  rate_limited: {
    code: "RATE_LIM",
    description: "Rate limit exceeded for channel",
    retryable: true,
  },
  invalid_number: {
    code: "INV_NUM",
    description: "Phone number format invalid",
    retryable: false,
  },
  network_error: {
    code: "NET_ERR",
    description: "Network connection failed",
    retryable: true,
  },
  provider_error: {
    code: "PROV_ERR",
    description: "Third-party provider returned error",
    retryable: true,
  },
  timeout: {
    code: "TIMEOUT",
    description: "Request timed out",
    retryable: true,
  },
  rejected_by_recipient: {
    code: "REJECTED",
    description: "Message rejected by recipient",
    retryable: false,
  },
  content_blocked: {
    code: "BLOCKED",
    description: "Content flagged by provider",
    retryable: false,
  },
  unknown: {
    code: "UNKNOWN",
    description: "Unknown error occurred",
    retryable: false,
  },
};

// ============================================================================
// ADMIN VISIBILITY RULES
// ============================================================================

export interface AdminVisibility {
  canSeeFailureReason: boolean;
  canManualResend: boolean;
  canViewInternalNotes: boolean;
  canEditMessage: boolean;
  canCancelMessage: boolean;
}

export type UserRole = "teacher" | "school_admin" | "platform_admin";

export function getAdminVisibility(role: UserRole, state: MessageState): AdminVisibility {
  switch (role) {
    case "platform_admin":
      return {
        canSeeFailureReason: true,
        canManualResend: state === "failed",
        canViewInternalNotes: true,
        canEditMessage: state === "draft" || state === "pending",
        canCancelMessage: state !== "sent" && state !== "delivered",
      };
    
    case "school_admin":
      return {
        canSeeFailureReason: false, // Only see "Requires Attention"
        canManualResend: state === "failed",
        canViewInternalNotes: true,
        canEditMessage: state === "draft" || state === "pending",
        canCancelMessage: state !== "sent" && state !== "delivered",
      };
    
    case "teacher":
    default:
      return {
        canSeeFailureReason: false, // NEVER
        canManualResend: false, // Must escalate to admin
        canViewInternalNotes: false,
        canEditMessage: state === "draft",
        canCancelMessage: state === "draft" || state === "pending",
      };
  }
}

// ============================================================================
// QUEUE ENTRY SCHEMA (for documentation)
// ============================================================================

/**
 * Message Queue Entry Schema
 * 
 * Table: message_queue
 * 
 * | Column          | Type        | Description                           |
 * |-----------------|-------------|---------------------------------------|
 * | id              | uuid        | Primary key                           |
 * | message_id      | uuid        | FK to parent_messages                 |
 * | channel         | enum        | Target delivery channel               |
 * | priority_level  | int         | 1-4 (higher = more urgent)            |
 * | scheduled_for   | timestamptz | When to attempt delivery              |
 * | attempts        | int         | Number of attempts made (max 1)       |
 * | max_attempts    | int         | Maximum allowed attempts (always 1)   |
 * | last_error      | text        | Internal error (NEVER exposed)        |
 * | processed_at    | timestamptz | When processing completed             |
 * | created_at      | timestamptz | Queue entry creation time             |
 * 
 * Notes:
 * - `last_error` is INTERNAL ONLY - never shown to parents or teachers
 * - `max_attempts` is always 1 per channel
 * - Priority affects queue ordering, not retry behavior
 */

export const MESSAGE_QUEUE_SCHEMA = {
  tableName: "message_queue",
  columns: [
    { name: "id", type: "uuid", primaryKey: true },
    { name: "message_id", type: "uuid", foreignKey: "parent_messages" },
    { name: "channel", type: "delivery_channel", nullable: false },
    { name: "priority_level", type: "integer", default: 2 },
    { name: "scheduled_for", type: "timestamptz", default: "now()" },
    { name: "attempts", type: "integer", default: 0 },
    { name: "max_attempts", type: "integer", default: 1 },
    { name: "last_error", type: "text", nullable: true, internal: true },
    { name: "processed_at", type: "timestamptz", nullable: true },
    { name: "created_at", type: "timestamptz", default: "now()" },
  ],
  indexes: [
    { columns: ["scheduled_for", "priority_level"], where: "processed_at IS NULL" },
    { columns: ["message_id"] },
  ],
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user-appropriate status label
 */
export function getStatusLabel(state: MessageState, role: UserRole): string {
  switch (role) {
    case "platform_admin":
      return PLATFORM_ADMIN_STATUS_LABELS[state];
    case "school_admin":
      return ADMIN_STATUS_LABELS[state];
    case "teacher":
    default:
      return TEACHER_STATUS_LABELS[state];
  }
}

/**
 * Check if a message can be manually resent
 */
export function canResend(state: MessageState, role: UserRole): boolean {
  if (state !== "failed") return false;
  const visibility = getAdminVisibility(role, state);
  return visibility.canManualResend;
}

/**
 * Get the current state from database status
 */
export function getStateFromStatus(dbStatus: DeliveryStatus): MessageState {
  return STATUS_TO_STATE[dbStatus] || "failed";
}
