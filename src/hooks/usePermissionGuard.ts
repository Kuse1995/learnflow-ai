import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRBACContext } from '@/contexts/RBACContext';
import { AppRole, PermissionAction } from '@/lib/rbac-permissions';

// =============================================================================
// PERMISSION GUARD HOOK
// =============================================================================

interface UsePermissionGuardOptions {
  /** Actions to check */
  action?: PermissionAction;
  anyAction?: PermissionAction[];
  allActions?: PermissionAction[];
  /** Roles to check */
  role?: AppRole;
  anyRole?: AppRole[];
}

interface PermissionGuardResult {
  /** Whether the user has the required permissions */
  hasPermission: boolean;
  /** Whether permissions are still loading */
  isLoading: boolean;
  /** Navigate to access denied page */
  navigateToAccessDenied: () => void;
  /** Get the default route for the user's role */
  getDefaultRoute: () => string;
}

/**
 * Hook for checking permissions and handling unauthorized access.
 * 
 * This is a UI-level convenience hook. Backend RLS provides actual security.
 * 
 * @example
 * const { hasPermission, isLoading } = usePermissionGuard({ action: 'record_payment' });
 * 
 * if (!hasPermission) {
 *   return null; // Hide the button entirely
 * }
 */
export function usePermissionGuard(options: UsePermissionGuardOptions = {}): PermissionGuardResult {
  const { canPerform, hasRole, hasAnyRole, activeRole, isLoading } = useRBACContext();
  const navigate = useNavigate();

  const hasPermission = useMemo(() => {
    // Check action permissions
    let hasActionPermission = true;
    
    if (options.action) {
      hasActionPermission = canPerform(options.action);
    }
    
    if (options.anyAction?.length) {
      hasActionPermission = options.anyAction.some(a => canPerform(a));
    }
    
    if (options.allActions?.length) {
      hasActionPermission = options.allActions.every(a => canPerform(a));
    }

    // Check role permissions
    let hasRolePermission = true;
    
    if (options.role) {
      hasRolePermission = hasRole(options.role);
    }
    
    if (options.anyRole?.length) {
      hasRolePermission = hasAnyRole(options.anyRole);
    }

    return hasActionPermission && hasRolePermission;
  }, [options, canPerform, hasRole, hasAnyRole]);

  const navigateToAccessDenied = useCallback(() => {
    navigate('/access-denied', { replace: true });
  }, [navigate]);

  const getDefaultRoute = useCallback(() => {
    // Return appropriate default route based on active role
    switch (activeRole) {
      case 'platform_admin':
        return '/platform-admin/system-status';
      case 'school_admin':
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'parent':
        return '/parent';
      case 'student':
        return '/student';
      case 'bursar':
        return '/admin';
      default:
        return '/';
    }
  }, [activeRole]);

  return {
    hasPermission,
    isLoading,
    navigateToAccessDenied,
    getDefaultRoute,
  };
}

// =============================================================================
// ACTION VISIBILITY HOOK
// =============================================================================

/**
 * Hook for determining if UI actions should be visible.
 * Returns a function that checks multiple actions at once.
 * 
 * @example
 * const canShow = useActionVisibility();
 * 
 * return (
 *   <>
 *     {canShow('record_payment') && <PaymentButton />}
 *     {canShow('send_reminder') && <ReminderButton />}
 *   </>
 * );
 */
export function useActionVisibility() {
  const { canPerform, isLoading } = useRBACContext();

  const canShow = useCallback((action: PermissionAction): boolean => {
    if (isLoading) return false; // Hide actions while loading
    return canPerform(action);
  }, [canPerform, isLoading]);

  const canShowAny = useCallback((actions: PermissionAction[]): boolean => {
    if (isLoading) return false;
    return actions.some(action => canPerform(action));
  }, [canPerform, isLoading]);

  const canShowAll = useCallback((actions: PermissionAction[]): boolean => {
    if (isLoading) return false;
    return actions.every(action => canPerform(action));
  }, [canPerform, isLoading]);

  return { canShow, canShowAny, canShowAll, isLoading };
}

// =============================================================================
// DATA SCOPE GUARD HOOK
// =============================================================================

interface ScopeGuardResult {
  /** Check if user can access a specific class */
  canAccessClass: (classId: string) => boolean;
  /** Check if user can access a specific student */
  canAccessStudent: (studentId: string) => boolean;
  /** Whether scope data is still loading */
  isLoading: boolean;
}

/**
 * Hook for checking data scope access.
 * 
 * IMPORTANT: This is a UI convenience only. The actual access
 * control is enforced by database functions like can_access_class()
 * and can_access_student() via RLS policies.
 * 
 * @example
 * const { canAccessStudent } = useScopeGuard();
 * 
 * if (!canAccessStudent(studentId)) {
 *   return <AccessDenied />;
 * }
 */
export function useScopeGuard(): ScopeGuardResult {
  const { assignedClassIds, linkedStudentIds, isLoading, activeRole } = useRBACContext();

  const canAccessClass = useCallback((classId: string): boolean => {
    // Admins can access all classes in their school
    if (activeRole === 'admin' || activeRole === 'school_admin' || activeRole === 'platform_admin') {
      return true;
    }
    
    // Teachers can only access assigned classes
    if (activeRole === 'teacher') {
      return assignedClassIds.includes(classId);
    }
    
    // Parents and students have indirect access through student linkage
    return false;
  }, [activeRole, assignedClassIds]);

  const canAccessStudent = useCallback((studentId: string): boolean => {
    // Admins can access all students in their school
    if (activeRole === 'admin' || activeRole === 'school_admin' || activeRole === 'platform_admin') {
      return true;
    }
    
    // Parents can only access linked students
    if (activeRole === 'parent') {
      return linkedStudentIds.includes(studentId);
    }
    
    // Teachers have access through class assignment (check via backend)
    if (activeRole === 'teacher') {
      // UI-level check is permissive; backend enforces actual access
      return true;
    }
    
    // Students can only access their own profile
    if (activeRole === 'student') {
      return linkedStudentIds.includes(studentId);
    }
    
    return false;
  }, [activeRole, linkedStudentIds]);

  return {
    canAccessClass,
    canAccessStudent,
    isLoading,
  };
}
