import React, { ReactNode } from 'react';
import { useRBACContext } from '@/contexts/RBACContext';
import { AppRole, PermissionAction } from '@/lib/rbac-permissions';

// =============================================================================
// PERMISSION GATE COMPONENT
// =============================================================================

interface PermissionGateProps {
  children: ReactNode;
  /** Single action required */
  action?: PermissionAction;
  /** Any of these actions required */
  anyAction?: PermissionAction[];
  /** All of these actions required */
  allActions?: PermissionAction[];
  /** Single role required */
  role?: AppRole;
  /** Any of these roles required */
  anyRole?: AppRole[];
  /** Fallback to render when access denied */
  fallback?: ReactNode;
  /** Whether to hide content completely (default) or show fallback */
  hideWhenDenied?: boolean;
}

/**
 * Permission Gate Component
 * 
 * Conditionally renders children based on user permissions.
 * By default, hides content completely when access is denied.
 * 
 * @example
 * // Require single action
 * <PermissionGate action="record_payment">
 *   <PaymentButton />
 * </PermissionGate>
 * 
 * @example
 * // Require any of multiple roles
 * <PermissionGate anyRole={['admin', 'bursar']}>
 *   <FinancialSection />
 * </PermissionGate>
 * 
 * @example
 * // With custom fallback
 * <PermissionGate action="close_term" fallback={<AccessDeniedMessage />}>
 *   <CloseTermButton />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  action,
  anyAction,
  allActions,
  role,
  anyRole,
  fallback = null,
  hideWhenDenied = true,
}: PermissionGateProps) {
  const { canPerform, hasRole, hasAnyRole } = useRBACContext();

  // Check action-based permissions
  let hasActionPermission = true;

  if (action) {
    hasActionPermission = canPerform(action);
  }

  if (anyAction && anyAction.length > 0) {
    hasActionPermission = anyAction.some(a => canPerform(a));
  }

  if (allActions && allActions.length > 0) {
    hasActionPermission = allActions.every(a => canPerform(a));
  }

  // Check role-based permissions
  let hasRolePermission = true;

  if (role) {
    hasRolePermission = hasRole(role);
  }

  if (anyRole && anyRole.length > 0) {
    hasRolePermission = hasAnyRole(anyRole);
  }

  // Combined check
  const hasPermission = hasActionPermission && hasRolePermission;

  if (!hasPermission) {
    return hideWhenDenied ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

// =============================================================================
// ROLE-SPECIFIC GATES
// =============================================================================

interface RoleGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate anyRole={['platform_admin', 'school_admin', 'admin']} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function BursarGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate anyRole={['school_admin', 'admin', 'bursar']} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function TeacherGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate anyRole={['teacher', 'school_admin', 'admin']} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function ParentGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate role="parent" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function StudentGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate role="student" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function PlatformAdminGate({ children, fallback }: RoleGateProps) {
  return (
    <PermissionGate role="platform_admin" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}
