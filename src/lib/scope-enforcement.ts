/**
 * Data Scope Enforcement
 * 
 * Application-level enforcement of data ownership and access boundaries.
 * Ensures users only see/act on data within their authorized scope.
 */

import { AppRole } from './rbac-permissions';

// =============================================================================
// TYPES
// =============================================================================

export type ScopeType = 'school' | 'class' | 'student' | 'user';

export interface DataScope {
  schoolId: string | null;
  classIds: string[];
  studentIds: string[];
  userId: string | null;
}

export interface ScopeContext {
  role: AppRole;
  activeRole: AppRole | null;
  schoolId: string | null;
  assignedClassIds: string[];
  linkedStudentIds: string[];
  userId: string | null;
}

export interface ScopeValidation {
  valid: boolean;
  reason?: string;
  requiredScope?: ScopeType;
  missingId?: string;
}

export interface ScopeViolation {
  attemptedAction: string;
  entityType: string;
  entityId?: string;
  requiredScope: ScopeType;
  userScope: ScopeType;
  reason: string;
  timestamp: string;
}

// =============================================================================
// SCOPE REQUIREMENTS BY ROLE
// =============================================================================

/**
 * Define the required scope for each role
 */
export const ROLE_SCOPE_REQUIREMENTS: Record<AppRole, ScopeType[]> = {
  platform_admin: ['school'], // Can access any school but must specify one
  school_admin: ['school'],
  admin: ['school'],
  bursar: ['school'],
  teacher: ['school', 'class'],
  parent: ['school', 'student'],
  student: ['school', 'student'],
  staff: ['school'],
};

/**
 * Define which scope types each role can access
 */
export const ROLE_SCOPE_ACCESS: Record<AppRole, {
  canAccessAllSchools: boolean;
  canAccessAllClasses: boolean;
  canAccessAllStudents: boolean;
}> = {
  platform_admin: {
    canAccessAllSchools: false, // Must still specify a school context
    canAccessAllClasses: true,
    canAccessAllStudents: true,
  },
  school_admin: {
    canAccessAllSchools: false,
    canAccessAllClasses: true,
    canAccessAllStudents: true,
  },
  admin: {
    canAccessAllSchools: false,
    canAccessAllClasses: true,
    canAccessAllStudents: true,
  },
  bursar: {
    canAccessAllSchools: false,
    canAccessAllClasses: true,
    canAccessAllStudents: true, // For financial data only
  },
  teacher: {
    canAccessAllSchools: false,
    canAccessAllClasses: false, // Only assigned classes
    canAccessAllStudents: false, // Only students in assigned classes
  },
  parent: {
    canAccessAllSchools: false,
    canAccessAllClasses: false,
    canAccessAllStudents: false, // Only linked children
  },
  student: {
    canAccessAllSchools: false,
    canAccessAllClasses: false,
    canAccessAllStudents: false, // Only self
  },
  staff: {
    canAccessAllSchools: false,
    canAccessAllClasses: false, // Staff-only areas
    canAccessAllStudents: false,
  },
};

// =============================================================================
// SCOPE VALIDATION
// =============================================================================

/**
 * Validate that a user can access a specific school
 */
export function canAccessSchool(
  context: ScopeContext,
  targetSchoolId: string
): ScopeValidation {
  if (!context.schoolId) {
    return {
      valid: false,
      reason: 'No school context established',
      requiredScope: 'school',
    };
  }

  if (context.schoolId !== targetSchoolId) {
    return {
      valid: false,
      reason: 'Access to this school is not permitted',
      requiredScope: 'school',
      missingId: targetSchoolId,
    };
  }

  return { valid: true };
}

/**
 * Validate that a user can access a specific class
 */
export function canAccessClass(
  context: ScopeContext,
  targetClassId: string
): ScopeValidation {
  const role = context.activeRole || context.role;
  const access = ROLE_SCOPE_ACCESS[role];

  // Admin roles can access all classes within their school
  if (access.canAccessAllClasses) {
    return { valid: true };
  }

  // Teachers can only access assigned classes
  if (role === 'teacher') {
    if (!context.assignedClassIds.includes(targetClassId)) {
      return {
        valid: false,
        reason: 'You are not assigned to this class',
        requiredScope: 'class',
        missingId: targetClassId,
      };
    }
  }

  // Parents/Students don't directly access classes
  if (role === 'parent' || role === 'student') {
    return {
      valid: false,
      reason: 'Class-level access is not available for this role',
      requiredScope: 'class',
    };
  }

  return { valid: true };
}

/**
 * Validate that a user can access a specific student
 */
export function canAccessStudent(
  context: ScopeContext,
  targetStudentId: string
): ScopeValidation {
  const role = context.activeRole || context.role;
  const access = ROLE_SCOPE_ACCESS[role];

  // Admin roles can access all students within their school
  if (access.canAccessAllStudents) {
    return { valid: true };
  }

  // Teachers can access students in their assigned classes
  // (This would require a lookup - handled at query level)
  if (role === 'teacher') {
    // The actual validation happens at query level by joining class assignments
    return { valid: true }; // Defer to query-level check
  }

  // Parents can only access linked students
  if (role === 'parent') {
    if (!context.linkedStudentIds.includes(targetStudentId)) {
      return {
        valid: false,
        reason: 'You are not linked to this student',
        requiredScope: 'student',
        missingId: targetStudentId,
      };
    }
  }

  // Students can only access themselves
  if (role === 'student') {
    if (!context.linkedStudentIds.includes(targetStudentId)) {
      return {
        valid: false,
        reason: 'You can only access your own data',
        requiredScope: 'student',
        missingId: targetStudentId,
      };
    }
  }

  return { valid: true };
}

// =============================================================================
// SCOPE ASSERTION (throws on failure)
// =============================================================================

/**
 * Assert that the current scope is valid for an action
 * Throws an error if scope is invalid
 */
export function assertScope(options: {
  context: ScopeContext;
  action: string;
  entityType: string;
  schoolId?: string;
  classId?: string;
  studentId?: string;
}): void {
  const { context, action, entityType, schoolId, classId, studentId } = options;
  const violations: string[] = [];

  // Check school scope
  if (schoolId) {
    const schoolResult = canAccessSchool(context, schoolId);
    if (!schoolResult.valid) {
      violations.push(schoolResult.reason || 'School access denied');
    }
  }

  // Check class scope
  if (classId) {
    const classResult = canAccessClass(context, classId);
    if (!classResult.valid) {
      violations.push(classResult.reason || 'Class access denied');
    }
  }

  // Check student scope
  if (studentId) {
    const studentResult = canAccessStudent(context, studentId);
    if (!studentResult.valid) {
      violations.push(studentResult.reason || 'Student access denied');
    }
  }

  if (violations.length > 0) {
    const error = new ScopeViolationError(
      `Scope violation for ${action} on ${entityType}: ${violations.join('; ')}`,
      {
        attemptedAction: action,
        entityType,
        entityId: studentId || classId || schoolId,
        requiredScope: studentId ? 'student' : classId ? 'class' : 'school',
        userScope: context.role === 'teacher' ? 'class' : 'school',
        reason: violations.join('; '),
        timestamp: new Date().toISOString(),
      }
    );
    throw error;
  }
}

// =============================================================================
// ERROR CLASS
// =============================================================================

export class ScopeViolationError extends Error {
  public violation: ScopeViolation;

  constructor(message: string, violation: ScopeViolation) {
    super(message);
    this.name = 'ScopeViolationError';
    this.violation = violation;
  }
}

// =============================================================================
// QUERY SCOPE BUILDERS
// =============================================================================

/**
 * Get scope filters for queries based on role
 * Returns filter objects to be applied to Supabase queries
 */
export function getScopeFilters(context: ScopeContext): {
  schoolFilter: { column: string; value: string } | null;
  classFilter: { column: string; values: string[] } | null;
  studentFilter: { column: string; values: string[] } | null;
} {
  const role = context.activeRole || context.role;
  const access = ROLE_SCOPE_ACCESS[role];

  return {
    // Always filter by school (except for platform_admin viewing across schools)
    schoolFilter: context.schoolId
      ? { column: 'school_id', value: context.schoolId }
      : null,

    // Class filter for non-admin roles
    classFilter:
      !access.canAccessAllClasses && context.assignedClassIds.length > 0
        ? { column: 'class_id', values: context.assignedClassIds }
        : null,

    // Student filter for parent/student roles
    studentFilter:
      !access.canAccessAllStudents && context.linkedStudentIds.length > 0
        ? { column: 'student_id', values: context.linkedStudentIds }
        : null,
  };
}

/**
 * Build a scoped query helper for teachers
 */
export function buildTeacherScopeQuery(context: ScopeContext) {
  if (!context.schoolId) {
    throw new Error('Teacher must have a school context');
  }

  return {
    schoolId: context.schoolId,
    classIds: context.assignedClassIds,
    // For student access, we'll filter through class membership
    hasClassAccess: (classId: string) => context.assignedClassIds.includes(classId),
  };
}

/**
 * Build a scoped query helper for parents
 */
export function buildParentScopeQuery(context: ScopeContext) {
  if (!context.schoolId) {
    throw new Error('Parent must have a school context');
  }

  return {
    schoolId: context.schoolId,
    studentIds: context.linkedStudentIds,
    hasStudentAccess: (studentId: string) =>
      context.linkedStudentIds.includes(studentId),
  };
}

// =============================================================================
// ENTITY-SPECIFIC SCOPE CHECKS
// =============================================================================

/**
 * Check if user can access uploads (teacher: by class, admin: all in school)
 */
export function canAccessUpload(
  context: ScopeContext,
  uploadClassId: string | null
): boolean {
  const role = context.activeRole || context.role;

  if (['platform_admin', 'school_admin', 'admin'].includes(role)) {
    return true;
  }

  if (role === 'teacher' && uploadClassId) {
    return context.assignedClassIds.includes(uploadClassId);
  }

  return false;
}

/**
 * Check if user can access attendance records
 */
export function canAccessAttendance(
  context: ScopeContext,
  attendanceClassId: string,
  attendanceStudentId?: string
): boolean {
  const role = context.activeRole || context.role;

  if (['platform_admin', 'school_admin', 'admin'].includes(role)) {
    return true;
  }

  if (role === 'teacher') {
    return context.assignedClassIds.includes(attendanceClassId);
  }

  if (role === 'parent' && attendanceStudentId) {
    return context.linkedStudentIds.includes(attendanceStudentId);
  }

  return false;
}

/**
 * Check if user can access fee data
 */
export function canAccessFees(
  context: ScopeContext,
  feeStudentId?: string
): boolean {
  const role = context.activeRole || context.role;

  // Bursar/Admin can access all fees in school
  if (['platform_admin', 'school_admin', 'admin', 'bursar'].includes(role)) {
    return true;
  }

  // Parents can only see their linked students' fees
  if (role === 'parent' && feeStudentId) {
    return context.linkedStudentIds.includes(feeStudentId);
  }

  // Teachers cannot access fees
  if (role === 'teacher') {
    return false;
  }

  return false;
}

/**
 * Check if user can access AI-generated content
 */
export function canAccessAIContent(
  context: ScopeContext,
  contentClassId?: string,
  contentStudentId?: string
): boolean {
  const role = context.activeRole || context.role;

  // Only teachers can access AI tools, scoped to their classes
  if (role === 'teacher') {
    if (contentClassId) {
      return context.assignedClassIds.includes(contentClassId);
    }
    return true; // Allow if no class specified (creating new)
  }

  // Parents can see approved insights for their children
  if (role === 'parent' && contentStudentId) {
    return context.linkedStudentIds.includes(contentStudentId);
  }

  // Admins can view all
  if (['platform_admin', 'school_admin', 'admin'].includes(role)) {
    return true;
  }

  return false;
}
