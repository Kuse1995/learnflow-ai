/**
 * Delivery Timing Rules
 * 
 * Manages when messages can be delivered based on:
 * - Quiet hours (avoid late-night notifications)
 * - Message urgency/category
 * - Emergency overrides
 * - Parent preferences
 */

import type { Database } from '@/integrations/supabase/types';

export type MessageCategory = Database['public']['Enums']['message_category'];

// =============================================================================
// TYPES
// =============================================================================

export type DeliveryUrgency = 'emergency' | 'urgent' | 'normal' | 'low';

export interface TimingDecision {
  canSendNow: boolean;
  reason: TimingReason;
  scheduledFor: Date | null;
  delayMinutes: number;
  overrideApplied: boolean;
}

export type TimingReason = 
  | 'immediate_allowed'
  | 'emergency_override'
  | 'within_send_hours'
  | 'quiet_hours_active'
  | 'weekend_delay'
  | 'queued_for_morning'
  | 'parent_quiet_hours'
  | 'rate_limited';

export interface QuietHoursConfig {
  enabled: boolean;
  startHour: number;  // 24-hour format (e.g., 21 = 9 PM)
  endHour: number;    // 24-hour format (e.g., 7 = 7 AM)
  timezone: string;
  weekendRules: 'same' | 'extended' | 'disabled';
}

export interface DeliveryWindow {
  startHour: number;
  endHour: number;
  days: number[];  // 0 = Sunday, 6 = Saturday
}

export interface TimingOverride {
  type: 'emergency' | 'admin_override' | 'parent_preference';
  bypassQuietHours: boolean;
  bypassRateLimits: boolean;
  reason: string;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default quiet hours: 9 PM to 7 AM
 * No notifications during these hours unless emergency
 */
export const DEFAULT_QUIET_HOURS: QuietHoursConfig = {
  enabled: true,
  startHour: 21,  // 9 PM
  endHour: 7,     // 7 AM
  timezone: 'Africa/Lagos',  // Default timezone (adjust per school)
  weekendRules: 'extended',  // Extended quiet hours on weekends
};

/**
 * Weekend extended quiet hours: 10 PM to 9 AM
 */
export const WEEKEND_QUIET_HOURS = {
  startHour: 22,  // 10 PM
  endHour: 9,     // 9 AM
};

/**
 * Preferred delivery windows by category
 */
export const DELIVERY_WINDOWS: Record<MessageCategory, DeliveryWindow> = {
  learning_update: {
    startHour: 14,  // 2 PM - after school
    endHour: 19,    // 7 PM
    days: [1, 2, 3, 4, 5],  // Weekdays only
  },
  attendance_notice: {
    startHour: 8,   // 8 AM - school hours
    endHour: 18,    // 6 PM
    days: [1, 2, 3, 4, 5],
  },
  school_announcement: {
    startHour: 9,   // 9 AM
    endHour: 20,    // 8 PM
    days: [0, 1, 2, 3, 4, 5, 6],  // Any day
  },
  fee_status: {
    startHour: 9,   // 9 AM
    endHour: 17,    // 5 PM - business hours
    days: [1, 2, 3, 4, 5],
  },
  emergency_notice: {
    startHour: 0,   // Any time
    endHour: 24,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
};

/**
 * Category to urgency mapping
 */
export const CATEGORY_URGENCY: Record<MessageCategory, DeliveryUrgency> = {
  emergency_notice: 'emergency',
  attendance_notice: 'urgent',
  school_announcement: 'normal',
  learning_update: 'low',
  fee_status: 'normal',
};

/**
 * Maximum delay by urgency (in hours)
 */
export const MAX_DELAY_HOURS: Record<DeliveryUrgency, number> = {
  emergency: 0,     // Never delay
  urgent: 4,        // Max 4 hours
  normal: 12,       // Max 12 hours
  low: 24,          // Can wait until next day
};

/**
 * Rate limits per parent per day
 */
export const RATE_LIMITS = {
  maxMessagesPerDay: 5,
  maxMessagesPerHour: 2,
  excludeEmergencies: true,
};

// =============================================================================
// TIMING LOGIC
// =============================================================================

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(
  config: QuietHoursConfig = DEFAULT_QUIET_HOURS,
  currentTime: Date = new Date()
): boolean {
  if (!config.enabled) return false;

  const hour = currentTime.getHours();
  const dayOfWeek = currentTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let startHour = config.startHour;
  let endHour = config.endHour;

  // Apply weekend rules
  if (isWeekend && config.weekendRules === 'extended') {
    startHour = WEEKEND_QUIET_HOURS.startHour;
    endHour = WEEKEND_QUIET_HOURS.endHour;
  } else if (isWeekend && config.weekendRules === 'disabled') {
    return false;
  }

  // Handle overnight quiet hours (e.g., 9 PM to 7 AM)
  if (startHour > endHour) {
    return hour >= startHour || hour < endHour;
  }

  return hour >= startHour && hour < endHour;
}

/**
 * Check if current time is within delivery window
 */
export function isWithinDeliveryWindow(
  category: MessageCategory,
  currentTime: Date = new Date()
): boolean {
  const window = DELIVERY_WINDOWS[category];
  const hour = currentTime.getHours();
  const dayOfWeek = currentTime.getDay();

  const dayAllowed = window.days.includes(dayOfWeek);
  const hourAllowed = hour >= window.startHour && hour < window.endHour;

  return dayAllowed && hourAllowed;
}

/**
 * Calculate next available send time
 */
export function getNextSendTime(
  category: MessageCategory,
  config: QuietHoursConfig = DEFAULT_QUIET_HOURS,
  currentTime: Date = new Date()
): Date {
  const window = DELIVERY_WINDOWS[category];
  const nextTime = new Date(currentTime);

  // If emergency, send immediately
  if (category === 'emergency_notice') {
    return nextTime;
  }

  // Find next valid time slot
  let iterations = 0;
  const maxIterations = 48; // Max 48 hours ahead

  while (iterations < maxIterations) {
    const hour = nextTime.getHours();
    const dayOfWeek = nextTime.getDay();

    // Check if this time slot works
    if (
      window.days.includes(dayOfWeek) &&
      hour >= window.startHour &&
      hour < window.endHour &&
      !isQuietHours(config, nextTime)
    ) {
      return nextTime;
    }

    // Advance by 1 hour
    nextTime.setHours(nextTime.getHours() + 1);
    nextTime.setMinutes(0);
    nextTime.setSeconds(0);
    iterations++;
  }

  // Fallback: return next morning at delivery window start
  nextTime.setDate(nextTime.getDate() + 1);
  nextTime.setHours(window.startHour, 0, 0, 0);
  return nextTime;
}

/**
 * Main timing decision function
 */
export function getDeliveryTiming(
  category: MessageCategory,
  options: {
    quietHoursConfig?: QuietHoursConfig;
    parentQuietHours?: { start: number; end: number } | null;
    currentTime?: Date;
    override?: TimingOverride;
    messageCount24h?: number;
    messageCountHour?: number;
  } = {}
): TimingDecision {
  const {
    quietHoursConfig = DEFAULT_QUIET_HOURS,
    parentQuietHours = null,
    currentTime = new Date(),
    override = null,
    messageCount24h = 0,
    messageCountHour = 0,
  } = options;

  const urgency = CATEGORY_URGENCY[category];

  // ==========================================================================
  // OVERRIDE CONDITIONS (highest priority)
  // ==========================================================================

  // Emergency always sends immediately
  if (category === 'emergency_notice' || urgency === 'emergency') {
    return {
      canSendNow: true,
      reason: 'emergency_override',
      scheduledFor: null,
      delayMinutes: 0,
      overrideApplied: true,
    };
  }

  // Admin override
  if (override?.bypassQuietHours && override?.bypassRateLimits) {
    return {
      canSendNow: true,
      reason: 'immediate_allowed',
      scheduledFor: null,
      delayMinutes: 0,
      overrideApplied: true,
    };
  }

  // ==========================================================================
  // RATE LIMITING (check before timing)
  // ==========================================================================

  if (!override?.bypassRateLimits) {
    if (messageCount24h >= RATE_LIMITS.maxMessagesPerDay) {
      const nextSend = getNextSendTime(category, quietHoursConfig, currentTime);
      nextSend.setDate(nextSend.getDate() + 1);
      nextSend.setHours(DELIVERY_WINDOWS[category].startHour, 0, 0, 0);

      return {
        canSendNow: false,
        reason: 'rate_limited',
        scheduledFor: nextSend,
        delayMinutes: Math.round((nextSend.getTime() - currentTime.getTime()) / 60000),
        overrideApplied: false,
      };
    }

    if (messageCountHour >= RATE_LIMITS.maxMessagesPerHour) {
      const nextSend = new Date(currentTime);
      nextSend.setHours(nextSend.getHours() + 1, 0, 0, 0);

      return {
        canSendNow: false,
        reason: 'rate_limited',
        scheduledFor: nextSend,
        delayMinutes: Math.round((nextSend.getTime() - currentTime.getTime()) / 60000),
        overrideApplied: false,
      };
    }
  }

  // ==========================================================================
  // PARENT PREFERENCE QUIET HOURS
  // ==========================================================================

  if (parentQuietHours && !override?.bypassQuietHours) {
    const hour = currentTime.getHours();
    const { start, end } = parentQuietHours;

    let inParentQuietHours = false;
    if (start > end) {
      inParentQuietHours = hour >= start || hour < end;
    } else {
      inParentQuietHours = hour >= start && hour < end;
    }

    if (inParentQuietHours) {
      const nextSend = new Date(currentTime);
      if (hour >= start) {
        nextSend.setDate(nextSend.getDate() + 1);
      }
      nextSend.setHours(end, 0, 0, 0);

      return {
        canSendNow: false,
        reason: 'parent_quiet_hours',
        scheduledFor: nextSend,
        delayMinutes: Math.round((nextSend.getTime() - currentTime.getTime()) / 60000),
        overrideApplied: false,
      };
    }
  }

  // ==========================================================================
  // SYSTEM QUIET HOURS
  // ==========================================================================

  if (isQuietHours(quietHoursConfig, currentTime) && !override?.bypassQuietHours) {
    const nextSend = getNextSendTime(category, quietHoursConfig, currentTime);

    return {
      canSendNow: false,
      reason: 'quiet_hours_active',
      scheduledFor: nextSend,
      delayMinutes: Math.round((nextSend.getTime() - currentTime.getTime()) / 60000),
      overrideApplied: false,
    };
  }

  // ==========================================================================
  // DELIVERY WINDOW CHECK
  // ==========================================================================

  if (!isWithinDeliveryWindow(category, currentTime)) {
    const nextSend = getNextSendTime(category, quietHoursConfig, currentTime);

    // Check if delay exceeds maximum for urgency
    const maxDelayMs = MAX_DELAY_HOURS[urgency] * 60 * 60 * 1000;
    const actualDelayMs = nextSend.getTime() - currentTime.getTime();

    // For urgent messages, send now even if outside window
    if (actualDelayMs > maxDelayMs && urgency === 'urgent') {
      return {
        canSendNow: true,
        reason: 'immediate_allowed',
        scheduledFor: null,
        delayMinutes: 0,
        overrideApplied: true,
      };
    }

    const dayOfWeek = currentTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      canSendNow: false,
      reason: isWeekend ? 'weekend_delay' : 'queued_for_morning',
      scheduledFor: nextSend,
      delayMinutes: Math.round(actualDelayMs / 60000),
      overrideApplied: false,
    };
  }

  // ==========================================================================
  // ALL CHECKS PASSED - SEND NOW
  // ==========================================================================

  return {
    canSendNow: true,
    reason: 'within_send_hours',
    scheduledFor: null,
    delayMinutes: 0,
    overrideApplied: false,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format timing decision for display
 */
export function formatTimingReason(reason: TimingReason): string {
  const reasons: Record<TimingReason, string> = {
    immediate_allowed: 'Ready to send',
    emergency_override: 'Emergency - sending immediately',
    within_send_hours: 'Within delivery window',
    quiet_hours_active: 'Queued for morning (quiet hours)',
    weekend_delay: 'Scheduled for next school day',
    queued_for_morning: 'Scheduled for morning delivery',
    parent_quiet_hours: 'Respecting parent quiet hours',
    rate_limited: 'Delivery limit reached, queued',
  };
  return reasons[reason];
}

/**
 * Format scheduled time for display
 */
export function formatScheduledTime(date: Date | null): string {
  if (!date) return 'Now';

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMins = Math.round(diffMs / (1000 * 60));
    return `In ${diffMins} minutes`;
  }

  if (diffHours < 24) {
    return `In ${diffHours} hours`;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Check if message should bypass all timing rules
 */
export function shouldBypassTiming(
  category: MessageCategory,
  isEmergency: boolean = false
): boolean {
  return category === 'emergency_notice' || isEmergency;
}

/**
 * Get urgency badge color
 */
export function getUrgencyColor(urgency: DeliveryUrgency): string {
  const colors: Record<DeliveryUrgency, string> = {
    emergency: 'destructive',
    urgent: 'default',
    normal: 'secondary',
    low: 'outline',
  };
  return colors[urgency];
}

// =============================================================================
// TIMING RULES DOCUMENTATION
// =============================================================================

export const TIMING_RULES_SUMMARY = {
  quietHours: {
    weekdays: '9 PM - 7 AM',
    weekends: '10 PM - 9 AM (extended)',
    behavior: 'Non-emergency messages queued until morning',
  },
  emergencyOverrides: {
    bypasses: ['quiet hours', 'rate limits', 'delivery windows'],
    categories: ['school_closure', 'safety_incident', 'weather_disruption', 'infrastructure_failure'],
  },
  deliveryWindows: {
    learning_update: '2 PM - 7 PM (weekdays)',
    attendance: '8 AM - 6 PM (weekdays)',
    announcement: '9 AM - 8 PM (any day)',
    fee_update: '9 AM - 5 PM (weekdays)',
    emergency: '24/7',
  },
  rateLimits: {
    perDay: 5,
    perHour: 2,
    excludesEmergencies: true,
  },
  maxDelays: {
    emergency: '0 hours (never)',
    urgent: '4 hours max',
    normal: '12 hours max',
    low: '24 hours max',
  },
} as const;
