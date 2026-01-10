import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useUserRoles } from '@/hooks/useRBAC';
import {
  AppRole,
  PermissionAction,
  canPerformAction,
  sortRolesByPriority,
} from '@/lib/rbac-permissions';
import { useDemoMode, DEMO_USERS } from '@/contexts/DemoModeContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { isPlatformOwnerEmail } from '@/hooks/usePlatformOwner';
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
  
  // Platform Owner has unrestricted access
  isPlatformOwner: boolean;
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
  
  // Check if current user is the Platform Owner (unrestricted access)
  const { user } = useAuthContext();
  const isPlatformOwner = isPlatformOwnerEmail(user?.email);
  
  // Use demo credentials if in demo mode and no real user
  const effectiveUserId = userId ?? (isDemoMode ? demoUserId : null);
  const effectiveUserName = userName ?? (isDemoMode ? demoUserName : null);
  const effectiveSchoolId = schoolId ?? (isDemoMode ? demoSchoolId : null);
  
  // Fetch roles WITHOUT schoolId filter - we need ALL roles to determine where to redirect
  const { data: userRoles, isLoading } = useUserRoles(effectiveUserId ?? undefined);
  
  // Debug logging for role loading issues
  console.log('[RBACProvider] User:', effectiveUserId, 'Roles loaded:', userRoles, 'Loading:', isLoading);
  
  // In demo mode, inject the demo role directly
  // For Platform Owner, include all roles for simulation
  const roles = useMemo(() => {
    if (isPlatformOwner) {
      // Platform Owner can simulate any role
      return ['platform_admin', 'school_admin', 'teacher', 'parent', 'student'] as AppRole[];
    }
    if (isDemoMode && demoRole) {
      return [DEMO_USERS[demoRole].role];
    }
    if (!userRoles || userRoles.length === 0) {
      console.warn('[RBACProvider] No roles found for user:', effectiveUserId);
      return [];
    }
    return userRoles.map(r => r.role);
  }, [userRoles, isDemoMode, demoRole, isPlatformOwner, effectiveUserId]);

  const sortedRoles = useMemo(() => sortRolesByPriority(roles), [roles]);
  
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);

  // Set default active role to highest priority role
  const effectiveActiveRole = activeRole ?? (sortedRoles[0] || null);

  const setActiveRole = useCallback((role: AppRole) => {
    // Platform Owner can set any role for simulation
    if (isPlatformOwner || roles.includes(role)) {
      setActiveRoleState(role);
    }
  }, [roles, isPlatformOwner]);

  const hasRole = useCallback((role: AppRole) => {
    if (isPlatformOwner) return true; // Platform Owner bypass
    return roles.includes(role);
  }, [roles, isPlatformOwner]);

  const hasAnyRole = useCallback((checkRoles: AppRole[]) => {
    if (isPlatformOwner) return true; // Platform Owner bypass
    return checkRoles.some(role => roles.includes(role));
  }, [roles, isPlatformOwner]);

  const canPerform = useCallback((action: PermissionAction) => {
    if (isPlatformOwner) return true; // Platform Owner bypass
    return canPerformAction(roles, action);
  }, [roles, isPlatformOwner]);

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
    isPlatformOwner,
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
    isPlatformOwner,
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
      isPlatformOwner: false,
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
