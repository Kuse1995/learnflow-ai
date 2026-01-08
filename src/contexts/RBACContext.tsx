import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useUserRoles } from '@/hooks/useRBAC';
import {
  AppRole,
  PermissionAction,
  canPerformAction,
  sortRolesByPriority,
} from '@/lib/rbac-permissions';
import { useDemoMode, DEMO_USERS } from '@/contexts/DemoModeContext';

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface RBACContextValue {
  // User identity (injected, no auth yet)
  userId: string | null;
  userName: string | null;
  schoolId: string | null;
  
  // Roles
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  
  // Permission checks
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  canPerform: (action: PermissionAction) => boolean;
  
  // Scope data (populated by useDataScope)
  assignedClassIds: string[];
  linkedStudentIds: string[];
  
  // Loading state
  isLoading: boolean;
}

const RBACContext = createContext<RBACContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface RBACProviderProps {
  children: ReactNode;
  // These would come from auth in the future
  userId: string | null;
  userName?: string | null;
  schoolId?: string | null;
}

export function RBACProvider({
  children,
  userId,
  userName = null,
  schoolId = null,
}: RBACProviderProps) {
  // Check if demo mode is active
  const { isDemoMode, demoRole, demoUserId, demoUserName, demoSchoolId } = useDemoMode();
  
  // Use demo credentials if in demo mode and no real user
  const effectiveUserId = userId ?? (isDemoMode ? demoUserId : null);
  const effectiveUserName = userName ?? (isDemoMode ? demoUserName : null);
  const effectiveSchoolId = schoolId ?? (isDemoMode ? demoSchoolId : null);
  
  const { data: userRoles, isLoading } = useUserRoles(effectiveUserId ?? undefined, effectiveSchoolId ?? undefined);
  
  // In demo mode, inject the demo role directly
  const roles = useMemo(() => {
    if (isDemoMode && demoRole) {
      return [DEMO_USERS[demoRole].role];
    }
    if (!userRoles) return [];
    return userRoles.map(r => r.role);
  }, [userRoles, isDemoMode, demoRole]);

  const sortedRoles = useMemo(() => sortRolesByPriority(roles), [roles]);
  
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);

  // Set default active role to highest priority role
  const effectiveActiveRole = activeRole ?? (sortedRoles[0] || null);

  const setActiveRole = useCallback((role: AppRole) => {
    if (roles.includes(role)) {
      setActiveRoleState(role);
    }
  }, [roles]);

  const hasRole = useCallback((role: AppRole) => {
    return roles.includes(role);
  }, [roles]);

  const hasAnyRole = useCallback((checkRoles: AppRole[]) => {
    return checkRoles.some(role => roles.includes(role));
  }, [roles]);

  const canPerform = useCallback((action: PermissionAction) => {
    return canPerformAction(roles, action);
  }, [roles]);

  const value = useMemo(() => ({
    userId: effectiveUserId,
    userName: effectiveUserName,
    schoolId: effectiveSchoolId,
    roles,
    activeRole: effectiveActiveRole,
    setActiveRole,
    hasRole,
    hasAnyRole,
    canPerform,
    // Scope data - these will be populated by useDataScope
    assignedClassIds: [] as string[],
    linkedStudentIds: [] as string[],
    isLoading: isDemoMode ? false : isLoading,
  }), [
    effectiveUserId,
    effectiveUserName,
    effectiveSchoolId,
    roles,
    effectiveActiveRole,
    setActiveRole,
    hasRole,
    hasAnyRole,
    canPerform,
    isLoading,
    isDemoMode,
  ]);

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useRBACContext(): RBACContextValue {
  const context = useContext(RBACContext);
  
  if (!context) {
    // Return a default context for when provider isn't present
    // This allows components to work without full RBAC setup during development
    return {
      userId: null,
      userName: null,
      schoolId: null,
      roles: [],
      activeRole: null,
      setActiveRole: () => {},
      hasRole: () => true, // Permissive default during dev
      hasAnyRole: () => true,
      canPerform: () => true,
      assignedClassIds: [],
      linkedStudentIds: [],
      isLoading: false,
    };
  }
  
  return context;
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Quick check if user can perform an action
 */
export function useCanPerform(action: PermissionAction): boolean {
  const { canPerform } = useRBACContext();
  return canPerform(action);
}

/**
 * Get the active role
 */
export function useActiveRole(): AppRole | null {
  const { activeRole } = useRBACContext();
  return activeRole;
}

/**
 * Get all user roles
 */
export function useRoles(): AppRole[] {
  const { roles } = useRBACContext();
  return roles;
}
