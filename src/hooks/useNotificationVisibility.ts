/**
 * Notification Visibility Hooks
 * 
 * React hooks for managing role-based notification visibility
 * and permissions in the UI.
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getEffectivePermissions,
  canViewNotification,
  canCancelNotification,
  canResendNotification,
  canInitiateNotification,
  filterVisibleNotifications,
  getActionableNotifications,
  getStatusLabelForRole,
  getAvailableActions,
  VISIBILITY_MATRIX,
  VISIBILITY_RULES_SUMMARY,
  type NotificationRole,
  type NotificationContext,
  type UserContext,
  type VisibilityPermissions,
} from '@/lib/notification-visibility-rules';
import type { Database } from '@/integrations/supabase/types';

type MessageCategory = Database['public']['Enums']['message_category'];

// =============================================================================
// USER CONTEXT HOOK
// =============================================================================

/**
 * Get current user's notification context
 */
export function useNotificationUserContext(schoolId?: string): UserContext | null {
  // Fetch user's classes for teacher role
  const { data: userClasses } = useQuery({
    queryKey: ['user-classes-for-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id')
        .is('deleted_at', null);

      if (error) return [];
      return data.map((c) => c.id);
    },
  });

  // For demo purposes, return a mock context
  // In production, this would come from auth context
  return useMemo(() => {
    if (!schoolId) return null;

    return {
      userId: 'current-user-id',
      role: 'teacher' as NotificationRole, // Would come from auth
      schoolId,
      classIds: userClasses ?? [],
    };
  }, [schoolId, userClasses]);
}

// =============================================================================
// PERMISSIONS HOOK
// =============================================================================

/**
 * Get permissions for a specific notification
 */
export function useNotificationPermissions(
  notification: NotificationContext | null,
  userContext: UserContext | null
) {
  const permissions = useMemo((): VisibilityPermissions => {
    if (!notification || !userContext) {
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

    return getEffectivePermissions(userContext, notification);
  }, [notification, userContext]);

  const availableActions = useMemo(() => {
    if (!notification || !userContext) return [];
    return getAvailableActions(userContext, notification);
  }, [notification, userContext]);

  const statusLabel = useMemo(() => {
    if (!notification || !userContext) return '';
    return getStatusLabelForRole(notification.status, userContext.role);
  }, [notification, userContext]);

  return {
    permissions,
    availableActions,
    statusLabel,
    canView: permissions.canView,
    canCancel: permissions.canCancel,
    canResend: permissions.canResend,
    canModify: permissions.canModify,
  };
}

// =============================================================================
// VISIBILITY FILTER HOOK
// =============================================================================

/**
 * Filter notifications based on user visibility
 */
export function useVisibleNotifications<T extends NotificationContext>(
  notifications: T[],
  userContext: UserContext | null
) {
  const visibleNotifications = useMemo(() => {
    if (!userContext) return [];
    return filterVisibleNotifications(notifications, userContext);
  }, [notifications, userContext]);

  const actionableNotifications = useMemo(() => {
    if (!userContext) return [];
    return getActionableNotifications(notifications, userContext);
  }, [notifications, userContext]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      visible: visibleNotifications.length,
      actionable: actionableNotifications.length,
      hidden: notifications.length - visibleNotifications.length,
    };
  }, [notifications, visibleNotifications, actionableNotifications]);

  return {
    visibleNotifications,
    actionableNotifications,
    stats,
  };
}

// =============================================================================
// INITIATION PERMISSION HOOK
// =============================================================================

/**
 * Check if user can initiate different notification types
 */
export function useInitiationPermissions(userContext: UserContext | null) {
  const categories: MessageCategory[] = [
    'attendance_notice',
    'learning_update',
    'school_announcement',
    'emergency_notice',
    'fee_status',
  ];

  const permissions = useMemo(() => {
    if (!userContext) {
      return categories.reduce((acc, cat) => {
        acc[cat] = false;
        return acc;
      }, {} as Record<MessageCategory, boolean>);
    }

    return categories.reduce((acc, cat) => {
      acc[cat] = canInitiateNotification(userContext, cat);
      return acc;
    }, {} as Record<MessageCategory, boolean>);
  }, [userContext]);

  const allowedCategories = useMemo(() => {
    return categories.filter((cat) => permissions[cat]);
  }, [permissions]);

  return {
    permissions,
    allowedCategories,
    canInitiateAny: allowedCategories.length > 0,
  };
}

// =============================================================================
// ROLE CAPABILITIES HOOK
// =============================================================================

/**
 * Get all capabilities for a role
 */
export function useRoleCapabilities(role: NotificationRole) {
  const basePermissions = VISIBILITY_MATRIX[role];
  const summary = VISIBILITY_RULES_SUMMARY[
    role === 'teacher' ? 'teachers' : 
    role === 'school_admin' ? 'schoolAdmins' : 'platformAdmins'
  ];

  return {
    permissions: basePermissions,
    summary,
    isTeacher: role === 'teacher',
    isAdmin: role === 'school_admin' || role === 'platform_admin',
    isPlatformAdmin: role === 'platform_admin',
  };
}

// =============================================================================
// ACTION HANDLERS HOOK
// =============================================================================

/**
 * Get action handlers with permission checks
 */
export function useNotificationActions(userContext: UserContext | null) {
  const checkAndCancel = useCallback(
    async (notification: NotificationContext, messageId: string) => {
      if (!userContext) throw new Error('Not authenticated');
      
      if (!canCancelNotification(userContext, notification)) {
        throw new Error('You do not have permission to cancel this notification');
      }

      const { error } = await supabase
        .from('parent_messages')
        .update({ 
          delivery_status: 'failed',
          internal_notes: 'Cancelled by ' + userContext.role 
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    [userContext]
  );

  const checkAndResend = useCallback(
    async (notification: NotificationContext, messageId: string) => {
      if (!userContext) throw new Error('Not authenticated');
      
      if (!canResendNotification(userContext, notification)) {
        throw new Error('You do not have permission to resend this notification');
      }

      const { error } = await supabase
        .from('parent_messages')
        .update({ delivery_status: 'queued' })
        .eq('id', messageId);

      if (error) throw error;
    },
    [userContext]
  );

  return {
    cancelNotification: checkAndCancel,
    resendNotification: checkAndResend,
  };
}

// =============================================================================
// VISIBILITY DOCUMENTATION HOOK
// =============================================================================

/**
 * Get visibility rules documentation
 */
export function useVisibilityRules() {
  return {
    rules: VISIBILITY_RULES_SUMMARY,
    matrix: VISIBILITY_MATRIX,
  };
}
