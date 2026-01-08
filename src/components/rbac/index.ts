// Permission gating
export {
  PermissionGate,
  AdminGate,
  BursarGate,
  TeacherGate,
  ParentGate,
  StudentGate,
  PlatformAdminGate,
} from './PermissionGate';

// Route protection
export {
  ProtectedRoute,
  ROUTE_PERMISSIONS,
  withRouteProtection,
  type RoutePermissions,
} from './ProtectedRoute';

// Access denied states
export {
  AccessDenied,
  AccessDeniedPage,
  FeatureNotAvailable,
  DataNotAccessible,
} from './AccessDenied';

// Role switching
export {
  RoleSwitcher,
  CurrentRoleBadge,
} from './RoleSwitcher';
