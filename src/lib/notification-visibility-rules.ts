/**
 * Notification Visibility Controls
 * 
 * Defines role-based access rules for automated notifications:
 * - Teachers: See own class notifications, no emergency modification
 * - Admins: Full visibility, can cancel/resend
 * - Platform Admins: Cross-school visibility for support
 */

import type { Database } from '@/integrations/supabase/types';

type MessageCategory = Database['public']['Enums']['message_category'];
type DeliveryStatus = Database['public']['Enums']['delivery_status'];

// =============================================================================
// TYPES
// =============================================================================

export type NotificationRole = 'teacher' | 'school_admin' | 'platform_admin';

export interface VisibilityPermissions {
  canView: boolean;
  canViewDetails: boolean;
  canCancel: boolean;
  canResend: boolean;
  canModify: boolean;
  canInitiate: boolean;
  canViewDeliveryLogs: boolean;
  canViewRecipientInfo: boolean;
  canExport: boolean;
}

export interface NotificationContext {
  category: MessageCategory;
  status: DeliveryStatus;
  classId?: string;
  schoolId: string;
  isEmergency: boolean;
  createdBy?: string;
}

export interface UserContext {
  userId: string;
  role: NotificationRole;
  schoolId: string;
  classIds: string[]; // Classes the user has access to
}

// =============================================================================
// VISIBILITY MATRIX
// =============================================================================

/**
 * Base visibility matrix by role
 * Defines default permissions for each role
 */
export const VISIBILITY_MATRIX: Record<NotificationRole, VisibilityPermissions> = {
  teacher: {
    canView: true,
    canViewDetails: true,
    canCancel: false,       // Teachers cannot cancel
    canResend: false,       // Teachers cannot resend
    canModify: false,       // Teachers cannot modify
    canInitiate: true,      // Can initiate non-emergency
    canViewDeliveryLogs: false,
    canViewRecipientInfo: true,  // Own students only
    canExport: false,
  },
  school_admin: {
    canView: true,
    canViewDetails: true,
    canCancel: true,        // Admins can cancel queued
    canResend: true,        // Admins can resend failed
    canModify: true,        // Admins can modify pending
    canInitiate: true,      // Can initiate all types
    canViewDeliveryLogs: true,
    canViewRecipientInfo: true,
    canExport: true,
  },
  platform_admin: {
    canView: true,
    canViewDetails: true,
    canCancel: true,
    canResend: true,
    canModify: true,
    canInitiate: true,
    canViewDeliveryLogs: true,
    canViewRecipientInfo: true,
    canExport: true,
  },
};

// =============================================================================
// CATEGORY-SPECIFIC RULES
// =============================================================================

/**
 * Category-specific permission overrides
 */
export const CATEGORY_RULES: Record<MessageCategory, Partial<Record<NotificationRole, Partial<VisibilityPermissions>>>> = {
  emergency_notice: {
    teacher: {
      canInitiate: false,   // Teachers cannot initiate emergencies
      canCancel: false,
      canResend: false,
      canModify: false,
    },
    school_admin: {
      canInitiate: true,    // Only admins can initiate
      canModify: false,     // Cannot modify once sent
    },
  },
  attendance_notice: {
    teacher: {
      canInitiate: true,
      canViewDetails: true,
    },
  },
  learning_update: {
    teacher: {
      canInitiate: true,
      canViewDetails: true,
    },
  },
  school_announcement: {
    teacher: {
      canInitiate: false,   // Only admins send school-wide
    },
    school_admin: {
      canInitiate: true,
    },
  },
  fee_status: {
    teacher: {
      canView: false,       // Teachers don't see fee messages
      canInitiate: false,
    },
    school_admin: {
      canInitiate: true,
    },
  },
};

// =============================================================================
// STATUS-SPECIFIC RULES
// =============================================================================

/**
 * Actions allowed based on notification status
 */
export const STATUS_ACTIONS: Record<DeliveryStatus, {
  canCancel: boolean;
  canResend: boolean;
  canModify: boolean;
}> = {
  pending: { canCancel: true, canResend: false, canModify: true },
  queued: { canCancel: true, canResend: false, canModify: false },
  sent: { canCancel: false, canResend: false, canModify: false },
  delivered: { canCancel: false, canResend: false, canModify: false },
  failed: { canCancel: false, canResend: true, canModify: false },
  no_channel: { canCancel: false, canResend: true, canModify: false },
};

// =============================================================================
// PERMISSION CHECKING FUNCTIONS
// =============================================================================

/**
 * Get effective permissions for a user on a notification
 */
export function getEffectivePermissions(
  user: UserContext,
  notification: NotificationContext
): VisibilityPermissions {
  // Start with base role permissions
  const basePermissions = { ...VISIBILITY_MATRIX[user.role] };

  // Check school-level access
  if (user.role !== 'platform_admin' && user.schoolId !== notification.schoolId) {
    return {
      canView: false,
      canViewDetails: false,
      canCancel: false,
      canResend: false,
      canModify: false,
      canInitiate: false,
      canViewDeliveryLogs: false,
      canViewRecipientInfo: false,
      canExport: false,
    };
  }

  // Apply category-specific rules
  const categoryRules = CATEGORY_RULES[notification.category]?.[user.role];
  if (categoryRules) {
    Object.assign(basePermissions, categoryRules);
  }

  // Apply status-specific restrictions
  const statusRules = STATUS_ACTIONS[notification.status];
  basePermissions.canCancel = basePermissions.canCancel && statusRules.canCancel;
  basePermissions.canResend = basePermissions.canResend && statusRules.canResend;
  basePermissions.canModify = basePermissions.canModify && statusRules.canModify;

  // Teachers can only see their own classes
  if (user.role === 'teacher' && notification.classId) {
    if (!user.classIds.includes(notification.classId)) {
      basePermissions.canView = false;
      basePermissions.canViewDetails = false;
      basePermissions.canViewRecipientInfo = false;
    }
  }

  // Emergency override - restrict teacher modifications
  if (notification.isEmergency && user.role === 'teacher') {
    basePermissions.canCancel = false;
    basePermissions.canResend = false;
    basePermissions.canModify = false;
    basePermissions.canInitiate = false;
  }

  return basePermissions;
}

/**
 * Check if user can perform a specific action
 */
export function canPerformAction(
  action: keyof VisibilityPermissions,
  user: UserContext,
  notification: NotificationContext
): boolean {
  const permissions = getEffectivePermissions(user, notification);
  return permissions[action];
}

/**
 * Check if user can view notification
 */
export function canViewNotification(
  user: UserContext,
  notification: NotificationContext
): boolean {
  return canPerformAction('canView', user, notification);
}

/**
 * Check if user can cancel notification
 */
export function canCancelNotification(
  user: UserContext,
  notification: NotificationContext
): boolean {
  return canPerformAction('canCancel', user, notification);
}

/**
 * Check if user can resend notification
 */
export function canResendNotification(
  user: UserContext,
  notification: NotificationContext
): boolean {
  return canPerformAction('canResend', user, notification);
}

/**
 * Check if user can initiate notification type
 */
export function canInitiateNotification(
  user: UserContext,
  category: MessageCategory
): boolean {
  const basePermissions = VISIBILITY_MATRIX[user.role];
  const categoryRules = CATEGORY_RULES[category]?.[user.role];
  
  if (categoryRules?.canInitiate !== undefined) {
    return categoryRules.canInitiate;
  }
  
  return basePermissions.canInitiate;
}

// =============================================================================
// FILTER FUNCTIONS
// =============================================================================

/**
 * Filter notifications based on user's visibility
 */
export function filterVisibleNotifications<T extends NotificationContext>(
  notifications: T[],
  user: UserContext
): T[] {
  return notifications.filter((n) => canViewNotification(user, n));
}

/**
 * Get actionable notifications (ones user can cancel/resend)
 */
export function getActionableNotifications<T extends NotificationContext>(
  notifications: T[],
  user: UserContext
): T[] {
  return notifications.filter((n) => {
    const perms = getEffectivePermissions(user, n);
    return perms.canCancel || perms.canResend;
  });
}

// =============================================================================
// UI DISPLAY HELPERS
// =============================================================================

/**
 * Get status label appropriate for user's role
 */
export function getStatusLabelForRole(
  status: DeliveryStatus,
  role: NotificationRole
): string {
  const teacherLabels: Record<DeliveryStatus, string> = {
    pending: 'Pending Review',
    queued: 'Sending Soon',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Delivery Issue',
    no_channel: 'No Contact Available',
  };

  const adminLabels: Record<DeliveryStatus, string> = {
    pending: 'Pending Approval',
    queued: 'In Queue',
    sent: 'Sent - Awaiting Delivery',
    delivered: 'Delivered',
    failed: 'Failed - Retry Available',
    no_channel: 'No Channel - Contact Update Needed',
  };

  return role === 'teacher' ? teacherLabels[status] : adminLabels[status];
}

/**
 * Get available actions for notification
 */
export function getAvailableActions(
  user: UserContext,
  notification: NotificationContext
): string[] {
  const perms = getEffectivePermissions(user, notification);
  const actions: string[] = [];

  if (perms.canViewDetails) actions.push('view');
  if (perms.canCancel) actions.push('cancel');
  if (perms.canResend) actions.push('resend');
  if (perms.canModify) actions.push('edit');
  if (perms.canExport) actions.push('export');

  return actions;
}

// =============================================================================
// DOCUMENTATION
// =============================================================================

export const VISIBILITY_RULES_SUMMARY = {
  teachers: {
    canSee: 'Notifications for their own classes only',
    canDo: ['View notification details', 'Initiate attendance/learning updates'],
    cannotDo: ['Cancel notifications', 'Resend failed', 'Modify emergency alerts', 'See fee messages'],
  },
  schoolAdmins: {
    canSee: 'All notifications for their school',
    canDo: ['Cancel queued messages', 'Resend failed notifications', 'View delivery logs', 'Export reports'],
    cannotDo: ['Modify sent messages', 'Access other schools'],
  },
  platformAdmins: {
    canSee: 'All notifications across schools',
    canDo: ['All admin actions', 'Cross-school support'],
    cannotDo: [],
  },
  emergencyRules: {
    initiation: 'Admin-only',
    modification: 'Not allowed once sent',
    teacherAccess: 'View only',
  },
} as const;
