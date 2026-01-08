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

// Access denied states
export {
  AccessDenied,
  AccessDeniedPage,
  FeatureNotAvailable,
} from './AccessDenied';

// Role switching
export {
  RoleSwitcher,
  CurrentRoleBadge,
} from './RoleSwitcher';
