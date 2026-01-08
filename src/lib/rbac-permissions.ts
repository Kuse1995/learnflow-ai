/**
 * RBAC Permission Matrix
 * 
 * Defines which roles can perform which actions across the system.
 * This is the single source of truth for permission checks.
 */

// =============================================================================
// TYPES
// =============================================================================

export type AppRole = 
  | 'platform_admin'
  | 'school_admin' 
  | 'admin'
  | 'bursar'
  | 'teacher'
  | 'parent'
  | 'student'
  | 'staff';

export type ActionCategory = 
  | 'fees'
  | 'attendance'
  | 'academics'
  | 'communication'
  | 'ai_tools'
  | 'reports'
  | 'admin'
  | 'role_management'
  | 'system';

export type PermissionAction =
  // Fee Management
  | 'view_fees'
  | 'record_payment'
  | 'add_adjustment'
  | 'send_reminder'
  | 'close_term'
  | 'view_financial_reports'
  | 'export_financial_data'
  | 'view_billing_status'
  // Attendance
  | 'view_attendance'
  | 'mark_attendance'
  | 'edit_attendance'
  // Academics (Admins have LIMITED access - no individual student data)
  | 'view_student_profiles'
  | 'edit_student_profiles'
  | 'view_grades'
  | 'record_grades'
  | 'upload_work'
  | 'view_uploads'
  | 'view_learning_profiles'
  | 'view_teaching_actions'
  | 'view_individual_student_data'
  // AI Tools (Admins CANNOT view AI content)
  | 'generate_lesson_plans'
  | 'generate_adaptive_support'
  | 'generate_learning_paths'
  | 'create_adaptive_support_plan'
  | 'edit_adaptive_support_plan'
  | 'acknowledge_adaptive_support_plan'
  | 'view_adaptive_support_plans'
  | 'create_parent_insight'
  | 'edit_parent_insight'
  | 'approve_parent_insights'
  | 'view_approved_parent_insights'
  | 'view_draft_parent_insights'
  | 'view_home_support_tips'
  | 'view_ai_suggestions'
  | 'view_ai_analyses'
  | 'view_ai_generated_content'
  | 'edit_teacher_content'
  | 'edit_parent_content'
  // Communication
  | 'send_parent_messages'
  | 'view_messages'
  | 'approve_messages'
  // Reports (Admins CAN view aggregated metrics only)
  | 'view_class_reports'
  | 'view_student_reports'
  | 'generate_term_reports'
  | 'export_reports'
  | 'view_usage_metrics'
  // Admin
  | 'manage_classes'
  | 'manage_students'
  | 'manage_teachers'
  | 'manage_fee_structures'
  | 'activate_plans'
  | 'deactivate_plans'
  | 'assign_teacher_accounts'
  | 'view_audit_logs'
  | 'modify_billing'
  | 'modify_subscription'
  | 'modify_system_config'
  // Role Management
  | 'assign_roles'
  | 'revoke_roles'
  | 'view_roles'
  // System
  | 'access_platform_admin'
  | 'access_school_admin'
  | 'view_system_status'
  | 'view_ai_diagnostics'
  | 'view_raw_prompts';

// =============================================================================
// PERMISSION MATRIX
// =============================================================================

/**
 * PERMISSION MATRIX
 * 
 * Teacher Permissions Summary:
 * ✅ CAN: View/manage own classes, view assigned students, upload assessments,
 *         view AI analyses, create/edit/acknowledge Adaptive Support Plans,
 *         create/edit/approve Parent Insights, view Teaching Actions & Learning Profiles
 * ❌ CANNOT: View other teachers' classes/students, modify billing/subscription,
 *            modify system config, see raw AI prompts/diagnostics
 * 
 * Parent Permissions Summary:
 * ✅ CAN: View ONLY their linked children, view approved Parent Insight summaries,
 *         view home support tips attached to approved insights, view attendance, view fees
 * ❌ CANNOT: View learning profiles, view adaptive support plans, view AI analyses,
 *            view teaching actions, edit/approve content, see drafts or unapproved summaries
 * 
 * Admin Permissions Summary:
 * ✅ CAN: Activate/deactivate school plans, assign teacher accounts, view usage metrics,
 *         view billing status flags, manage classes/students/teachers
 * ❌ CANNOT: View individual student learning data, view AI-generated instructional content,
 *            edit teacher or parent content
 */
const PERMISSION_MATRIX: Record<PermissionAction, AppRole[]> = {
  // Fee Management - Admins CAN view billing status
  view_fees: ['platform_admin', 'school_admin', 'admin', 'bursar', 'parent'],
  record_payment: ['school_admin', 'admin', 'bursar'],
  add_adjustment: ['school_admin', 'admin', 'bursar'],
  send_reminder: ['school_admin', 'admin', 'bursar'],
  close_term: ['school_admin', 'admin', 'bursar'],
  view_financial_reports: ['platform_admin', 'school_admin', 'admin', 'bursar'],
  export_financial_data: ['school_admin', 'admin', 'bursar'],
  view_billing_status: ['platform_admin', 'school_admin', 'admin', 'bursar'],

  // Attendance - Admins have oversight access
  view_attendance: ['platform_admin', 'school_admin', 'admin', 'teacher', 'parent'],
  mark_attendance: ['teacher', 'school_admin', 'admin'],
  edit_attendance: ['teacher', 'school_admin', 'admin'],

  // Academics - Admins CANNOT view individual student learning data
  view_student_profiles: ['platform_admin', 'school_admin', 'teacher', 'parent'], // Admins removed
  edit_student_profiles: ['school_admin', 'teacher'], // Admins removed
  view_grades: ['platform_admin', 'school_admin', 'teacher', 'parent', 'student'], // Admins removed
  record_grades: ['teacher', 'school_admin'],
  upload_work: ['teacher'],
  view_uploads: ['platform_admin', 'school_admin', 'teacher'], // Admins removed
  view_learning_profiles: ['platform_admin', 'school_admin', 'teacher'], // Admins CANNOT
  view_teaching_actions: ['platform_admin', 'school_admin', 'teacher'], // Admins CANNOT
  view_individual_student_data: ['platform_admin', 'school_admin', 'teacher'], // Admins CANNOT

  // AI Tools - Admins CANNOT view AI-generated content
  generate_lesson_plans: ['teacher'],
  generate_adaptive_support: ['teacher'],
  generate_learning_paths: ['teacher'],
  create_adaptive_support_plan: ['teacher'],
  edit_adaptive_support_plan: ['teacher'],
  acknowledge_adaptive_support_plan: ['teacher'],
  view_adaptive_support_plans: ['platform_admin', 'school_admin', 'teacher'], // Admins CANNOT
  create_parent_insight: ['teacher'],
  edit_parent_insight: ['teacher'],
  approve_parent_insights: ['teacher'],
  view_approved_parent_insights: ['platform_admin', 'school_admin', 'teacher', 'parent'], // Admins CANNOT
  view_draft_parent_insights: ['platform_admin', 'school_admin', 'teacher'], // Admins CANNOT
  view_home_support_tips: ['platform_admin', 'school_admin', 'teacher', 'parent'], // Admins CANNOT
  view_ai_suggestions: ['teacher'],
  view_ai_analyses: ['platform_admin', 'school_admin', 'teacher'], // Admins CANNOT
  view_ai_generated_content: ['platform_admin', 'school_admin', 'teacher'], // Admins CANNOT
  edit_teacher_content: ['teacher'], // Admins CANNOT
  edit_parent_content: [], // Nobody can edit parent content directly

  // Communication
  send_parent_messages: ['school_admin', 'admin', 'teacher'],
  view_messages: ['platform_admin', 'school_admin', 'admin', 'teacher', 'parent'],
  approve_messages: ['school_admin', 'admin'],

  // Reports - Admins CAN view aggregated usage metrics (counts only)
  view_class_reports: ['platform_admin', 'school_admin', 'teacher'], // Admins removed (has student data)
  view_student_reports: ['platform_admin', 'school_admin', 'teacher', 'parent'], // Admins removed
  generate_term_reports: ['school_admin', 'teacher'],
  export_reports: ['school_admin', 'teacher'],
  view_usage_metrics: ['platform_admin', 'school_admin', 'admin'], // Admins CAN (counts only)

  // Admin - Admins CAN manage plans and teacher accounts
  manage_classes: ['school_admin', 'admin'],
  manage_students: ['school_admin', 'admin'],
  manage_teachers: ['school_admin', 'admin'],
  manage_fee_structures: ['school_admin', 'admin', 'bursar'],
  activate_plans: ['platform_admin', 'school_admin', 'admin'],
  deactivate_plans: ['platform_admin', 'school_admin', 'admin'],
  assign_teacher_accounts: ['platform_admin', 'school_admin', 'admin'],
  view_audit_logs: ['platform_admin', 'school_admin', 'admin'],
  modify_billing: ['platform_admin', 'school_admin'],
  modify_subscription: ['platform_admin', 'school_admin'],
  modify_system_config: ['platform_admin'],

  // Role Management
  assign_roles: ['platform_admin', 'school_admin', 'admin'],
  revoke_roles: ['platform_admin', 'school_admin', 'admin'],
  view_roles: ['platform_admin', 'school_admin', 'admin'],

  // System
  access_platform_admin: ['platform_admin'],
  access_school_admin: ['school_admin', 'admin'],
  view_system_status: ['platform_admin', 'school_admin', 'admin'],
  view_ai_diagnostics: ['platform_admin'],
  view_raw_prompts: ['platform_admin'],
};

// =============================================================================
// PERMISSION CHECKS
// =============================================================================

/**
 * Check if a role can perform a specific action
 */
export function canRolePerform(role: AppRole, action: PermissionAction): boolean {
  const allowedRoles = PERMISSION_MATRIX[action];
  return allowedRoles?.includes(role) ?? false;
}

/**
 * Check if any of the user's roles can perform an action
 */
export function canPerformAction(
  userRoles: AppRole[],
  action: PermissionAction
): boolean {
  return userRoles.some(role => canRolePerform(role, action));
}

/**
 * Get all actions a role can perform
 */
export function getRolePermissions(role: AppRole): PermissionAction[] {
  return (Object.entries(PERMISSION_MATRIX) as [PermissionAction, AppRole[]][])
    .filter(([_, roles]) => roles.includes(role))
    .map(([action]) => action);
}

/**
 * Get all roles that can perform an action
 */
export function getRolesForAction(action: PermissionAction): AppRole[] {
  return PERMISSION_MATRIX[action] ?? [];
}

// =============================================================================
// ROLE CONFIGURATION
// =============================================================================

export const ROLE_CONFIG: Record<AppRole, {
  label: string;
  description: string;
  color: string;
  icon: string;
  priority: number;
}> = {
  platform_admin: {
    label: 'Platform Admin',
    description: 'Full platform access across all schools',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: 'Shield',
    priority: 0,
  },
  school_admin: {
    label: 'School Admin',
    description: 'Full access to school management',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: 'Building',
    priority: 1,
  },
  admin: {
    label: 'Admin',
    description: 'School administrative access',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    icon: 'Settings',
    priority: 2,
  },
  bursar: {
    label: 'Bursar',
    description: 'Financial management access',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    icon: 'Wallet',
    priority: 3,
  },
  teacher: {
    label: 'Teacher',
    description: 'Classroom and student management',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    icon: 'GraduationCap',
    priority: 4,
  },
  parent: {
    label: 'Parent',
    description: 'View child information and fees',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    icon: 'Users',
    priority: 5,
  },
  student: {
    label: 'Student',
    description: 'Access to learning materials',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    icon: 'BookOpen',
    priority: 6,
  },
  staff: {
    label: 'Staff',
    description: 'Non-teaching staff access',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    icon: 'Briefcase',
    priority: 7,
  },
};

/**
 * Get role label for display
 */
export function getRoleLabel(role: AppRole): string {
  return ROLE_CONFIG[role]?.label ?? role;
}

/**
 * Get role color classes
 */
export function getRoleColor(role: AppRole): string {
  return ROLE_CONFIG[role]?.color ?? 'bg-gray-100 text-gray-800';
}

/**
 * Sort roles by priority (highest access first)
 */
export function sortRolesByPriority(roles: AppRole[]): AppRole[] {
  return [...roles].sort((a, b) => 
    (ROLE_CONFIG[a]?.priority ?? 99) - (ROLE_CONFIG[b]?.priority ?? 99)
  );
}

// =============================================================================
// TEACHER SCOPE CONSTRAINTS
// =============================================================================

/**
 * Teacher permissions are scoped to their assigned classes.
 * Database functions can_access_class() and can_access_student() enforce this.
 */
export const TEACHER_SCOPE_RULES = {
  // What teachers CAN do (within their class scope)
  allowed: [
    'view_own_classes',
    'view_assigned_students',
    'upload_assessments',
    'view_ai_analyses',
    'create_adaptive_support_plan',
    'edit_adaptive_support_plan',
    'acknowledge_adaptive_support_plan',
    'create_parent_insight',
    'edit_parent_insight',
    'approve_parent_insight',
    'view_teaching_actions',
    'view_learning_profiles',
  ] as const,
  
  // What teachers CANNOT do
  forbidden: [
    'view_other_teachers_classes',
    'view_students_outside_classes',
    'modify_billing',
    'modify_subscription',
    'modify_system_config',
    'view_raw_ai_prompts',
    'view_ai_diagnostics',
  ] as const,
} as const;

/**
 * Check if an action is explicitly forbidden for teachers
 */
export function isTeacherForbidden(action: string): boolean {
  return (TEACHER_SCOPE_RULES.forbidden as readonly string[]).includes(action);
}

/**
 * Get all permissions available to teachers
 */
export function getTeacherPermissions(): PermissionAction[] {
  return getRolePermissions('teacher');
}

// =============================================================================
// PARENT SCOPE CONSTRAINTS
// =============================================================================

/**
 * Parent permissions are scoped to their linked children ONLY.
 * Database function can_access_student() enforces via guardian_student_links.
 * Parents can ONLY see teacher-approved content.
 */
export const PARENT_SCOPE_RULES = {
  // What parents CAN do (for their linked children only)
  allowed: [
    'view_linked_children',
    'view_approved_parent_insights',
    'view_home_support_tips',
    'view_attendance',
    'view_fees',
    'view_messages',
    'view_student_reports',
  ] as const,
  
  // What parents CANNOT do
  forbidden: [
    'view_other_students',
    'view_learning_profiles',
    'view_adaptive_support_plans',
    'view_ai_analyses',
    'view_teaching_actions',
    'view_draft_insights',
    'view_unapproved_content',
    'edit_any_content',
    'approve_any_content',
    'view_uploads',
    'view_class_reports',
  ] as const,
} as const;

/**
 * Check if an action is explicitly forbidden for parents
 */
export function isParentForbidden(action: string): boolean {
  return (PARENT_SCOPE_RULES.forbidden as readonly string[]).includes(action);
}

/**
 * Get all permissions available to parents
 */
export function getParentPermissions(): PermissionAction[] {
  return getRolePermissions('parent');
}

// =============================================================================
// ADMIN SCOPE CONSTRAINTS
// =============================================================================

/**
 * Admin permissions focus on governance and oversight, NOT student-level data.
 * Admins manage plans, accounts, and view aggregate metrics only.
 */
export const ADMIN_SCOPE_RULES = {
  // What admins CAN do
  allowed: [
    'activate_plans',
    'deactivate_plans',
    'assign_teacher_accounts',
    'view_usage_metrics',
    'view_billing_status',
    'manage_classes',
    'manage_students',
    'manage_teachers',
    'view_audit_logs',
    'assign_roles',
  ] as const,
  
  // What admins CANNOT do
  forbidden: [
    'view_individual_student_data',
    'view_learning_profiles',
    'view_ai_generated_content',
    'view_ai_analyses',
    'view_adaptive_support_plans',
    'view_teaching_actions',
    'edit_teacher_content',
    'edit_parent_content',
    'view_student_reports',
    'view_class_reports',
  ] as const,
} as const;

/**
 * Check if an action is explicitly forbidden for admins
 */
export function isAdminForbidden(action: string): boolean {
  return (ADMIN_SCOPE_RULES.forbidden as readonly string[]).includes(action);
}

/**
 * Get all permissions available to admins
 */
export function getAdminPermissions(): PermissionAction[] {
  return getRolePermissions('admin');
}
