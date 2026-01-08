import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRBACContext } from '@/contexts/RBACContext';
import { AppRole, PermissionAction } from '@/lib/rbac-permissions';
import { AccessDenied } from './AccessDenied';

// =============================================================================
// ROUTE CONFIGURATION TYPES
// =============================================================================

export interface RoutePermissions {
  /** Roles that can access this route */
  allowedRoles?: AppRole[];
  /** Actions required to access this route */
  requiredActions?: PermissionAction[];
  /** If true, user must have ALL required actions (default: any) */
  requireAllActions?: boolean;
  /** Redirect path for unauthorized users (default: show access denied) */
  redirectTo?: string;
  /** Custom access denied message */
  accessDeniedMessage?: string;
}

// =============================================================================
// PROTECTED ROUTE COMPONENT
// =============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  permissions: RoutePermissions;
  /** Show loading skeleton while checking permissions */
  loadingFallback?: ReactNode;
}

/**
 * Protected Route Component
 * 
 * Wraps routes to enforce role and permission-based access control.
 * Never reveals whether restricted data exists - shows generic "not available" message.
 * 
 * Security Note: This is a UI-level guard only. Backend RLS policies
 * provide the actual security enforcement.
 * 
 * @example
 * <Route 
 *   path="/admin" 
 *   element={
 *     <ProtectedRoute permissions={{ allowedRoles: ['admin', 'school_admin'] }}>
 *       <AdminDashboard />
 *     </ProtectedRoute>
 *   } 
 * />
 */
export function ProtectedRoute({
  children,
  permissions,
  loadingFallback,
}: ProtectedRouteProps) {
  const { roles, canPerform, hasAnyRole, isLoading } = useRBACContext();
  const location = useLocation();

  // Show loading state while permissions are being loaded
  if (isLoading) {
    return loadingFallback ? <>{loadingFallback}</> : (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Check role-based access
  const hasRoleAccess = !permissions.allowedRoles?.length || 
    hasAnyRole(permissions.allowedRoles);

  // Check action-based access
  let hasActionAccess = true;
  if (permissions.requiredActions?.length) {
    if (permissions.requireAllActions) {
      hasActionAccess = permissions.requiredActions.every(action => canPerform(action));
    } else {
      hasActionAccess = permissions.requiredActions.some(action => canPerform(action));
    }
  }

  const hasAccess = hasRoleAccess && hasActionAccess;

  if (!hasAccess) {
    // If redirect is specified, navigate there
    if (permissions.redirectTo) {
      return <Navigate to={permissions.redirectTo} state={{ from: location }} replace />;
    }

    // Otherwise show neutral access denied message
    // IMPORTANT: Never reveal if the resource exists or not
    return (
      <AccessDenied
        title="Not Available"
        message={permissions.accessDeniedMessage || 
          "This content is not available to your account. Please contact your administrator if you need assistance."}
        showBack={true}
        showHome={true}
      />
    );
  }

  return <>{children}</>;
}

// =============================================================================
// ROUTE PERMISSION PRESETS
// =============================================================================

/**
 * Pre-configured route permissions for common access patterns.
 * Use these to ensure consistent access control across the app.
 */
export const ROUTE_PERMISSIONS = {
  // Teacher routes
  teacher: {
    allowedRoles: ['teacher', 'school_admin', 'admin', 'platform_admin'] as AppRole[],
    accessDeniedMessage: "Teacher features are not available to your account.",
  },
  
  // Parent routes
  parent: {
    allowedRoles: ['parent'] as AppRole[],
    accessDeniedMessage: "Parent features are not available to your account.",
  },
  
  // Student routes
  student: {
    allowedRoles: ['student'] as AppRole[],
    accessDeniedMessage: "Student features are not available to your account.",
  },
  
  // School admin routes
  schoolAdmin: {
    allowedRoles: ['school_admin', 'admin', 'platform_admin'] as AppRole[],
    accessDeniedMessage: "Administrative features are not available to your account.",
  },
  
  // Platform admin routes
  platformAdmin: {
    allowedRoles: ['platform_admin'] as AppRole[],
    accessDeniedMessage: "Platform administration is not available to your account.",
  },
  
  // Financial routes (admin/bursar)
  financial: {
    allowedRoles: ['school_admin', 'admin', 'bursar', 'platform_admin'] as AppRole[],
    requiredActions: ['view_fees'] as PermissionAction[],
    accessDeniedMessage: "Financial features are not available to your account.",
  },
} satisfies Record<string, RoutePermissions>;

// =============================================================================
// HIGHER-ORDER COMPONENT FOR ROUTE PROTECTION
// =============================================================================

/**
 * HOC to wrap a component with route protection
 * 
 * @example
 * const ProtectedAdminPage = withRouteProtection(AdminPage, ROUTE_PERMISSIONS.schoolAdmin);
 */
export function withRouteProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permissions: RoutePermissions
): React.FC<P> {
  const ProtectedComponent: React.FC<P> = (props) => (
    <ProtectedRoute permissions={permissions}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );
  
  ProtectedComponent.displayName = `Protected(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return ProtectedComponent;
}
