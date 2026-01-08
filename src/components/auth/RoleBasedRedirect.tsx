import { Navigate } from 'react-router-dom';
import { useRBACContext } from '@/contexts/RBACContext';
import { usePlatformOwner } from '@/hooks/usePlatformOwner';

/**
 * Redirects authenticated users to their role-appropriate dashboard.
 * Platform owner goes to owner-control, otherwise based on active/primary role.
 */
export function RoleBasedRedirect() {
  const { activeRole, isLoading } = useRBACContext();
  const { isPlatformOwner, isLoading: ownerLoading } = usePlatformOwner();

  if (isLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Platform owner goes to owner control center
  if (isPlatformOwner) {
    return <Navigate to="/owner-control" replace />;
  }

  // Redirect based on active role
  switch (activeRole) {
    case 'platform_admin':
      return <Navigate to="/platform-admin/system-status" replace />;
    case 'school_admin':
    case 'admin':
    case 'bursar':
      return <Navigate to="/admin" replace />;
    case 'teacher':
      return <Navigate to="/teacher" replace />;
    case 'parent':
      // Parent needs a studentId - redirect to a landing or first linked student
      return <Navigate to="/parent/select" replace />;
    case 'student':
      return <Navigate to="/student" replace />;
    default:
      // No role assigned - show access denied or redirect to auth
      return <Navigate to="/auth" replace />;
  }
}
