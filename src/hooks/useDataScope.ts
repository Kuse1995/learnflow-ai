import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRBACContext } from '@/contexts/RBACContext';
import {
  ScopeContext,
  ScopeValidation,
  ScopeViolation,
  canAccessSchool,
  canAccessClass,
  canAccessStudent,
  canAccessUpload,
  canAccessAttendance,
  canAccessFees,
  canAccessAIContent,
  getScopeFilters,
  assertScope,
  ScopeViolationError,
} from '@/lib/scope-enforcement';
import type { AppRole } from '@/lib/rbac-permissions';

// =============================================================================
// TYPES
// =============================================================================

export interface TeacherClassAssignment {
  classId: string;
  className: string;
  grade: string | null;
}

export interface ParentStudentLink {
  studentId: string;
  studentName: string;
  classId: string | null;
}

// =============================================================================
// SIMPLE QUERY HELPERS (use eslint-disable to break deep type chain)
// =============================================================================

interface GuardianLinkRow { student_id: string }
interface StudentRow { id: string; name: string; class_id: string | null; school_id?: string }
interface UploadRow { id: string; class_id: string | null; school_id: string; created_at: string; file_name?: string; file_type?: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchGuardianLinks(guardianId: string): Promise<GuardianLinkRow[]> {
  const result = await (supabase as any).from('guardian_student_links').select('student_id').eq('guardian_id', guardianId).eq('is_active', true);
  if (result.error) throw result.error;
  return result.data || [];
}

async function fetchStudentsByIds(ids: string[]): Promise<StudentRow[]> {
  const result = await (supabase as any).from('students').select('id, name, class_id').in('id', ids);
  if (result.error) throw result.error;
  return result.data || [];
}

async function fetchStudentByUserId(userId: string): Promise<StudentRow | null> {
  const result = await (supabase as any).from('students').select('id, name, class_id').eq('user_id', userId).limit(1);
  if (result.error) throw result.error;
  return result.data && result.data.length > 0 ? result.data[0] : null;
}

async function fetchScopedStudents(params: {
  schoolId: string;
  classId?: string;
  studentIds?: string[];
  classIds?: string[];
}): Promise<StudentRow[]> {
  const { schoolId, classId, studentIds, classIds } = params;
  let q = (supabase as any).from('students').select('id, name, class_id, school_id').eq('school_id', schoolId);
  if (classId) q = q.eq('class_id', classId);
  else if (studentIds?.length) q = q.in('id', studentIds);
  else if (classIds?.length) q = q.in('class_id', classIds);
  const result = await q.order('name');
  if (result.error) throw result.error;
  return result.data || [];
}

async function fetchScopedUploads(params: {
  schoolId: string;
  classId?: string;
  classIds?: string[];
}): Promise<UploadRow[]> {
  const { schoolId, classId, classIds } = params;
  let q = (supabase as any).from('uploads').select('id, class_id, school_id, created_at, file_name, file_type').eq('school_id', schoolId);
  if (classId) q = q.eq('class_id', classId);
  else if (classIds?.length) q = q.in('class_id', classIds);
  const result = await q.order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// =============================================================================
// HOOKS FOR FETCHING SCOPE DATA
// =============================================================================

/**
 * Get classes assigned to a teacher
 */
export function useTeacherAssignedClasses(userId: string | undefined, schoolId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-assigned-classes', userId, schoolId],
    queryFn: async (): Promise<TeacherClassAssignment[]> => {
      if (!userId || !schoolId) return [];

      // Get classes where teacher_id matches user
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, grade')
        .eq('teacher_id', userId)
        .eq('school_id', schoolId)
        .is('deleted_at', null);

      if (error) throw error;

      return (data || []).map(c => ({
        classId: c.id,
        className: c.name,
        grade: c.grade,
      }));
    },
    enabled: !!userId && !!schoolId,
  });
}

/**
 * Get students linked to a parent
 */
export function useParentLinkedStudents(userId: string | undefined, schoolId: string | undefined) {
  return useQuery({
    queryKey: ['parent-linked-students', userId, schoolId],
    queryFn: async (): Promise<ParentStudentLink[]> => {
      if (!userId || !schoolId) return [];

      const links = await fetchGuardianLinks(userId);
      if (links.length === 0) return [];

      const studentIds = links.map(l => l.student_id);
      const students = await fetchStudentsByIds(studentIds);

      return students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        classId: s.class_id,
      }));
    },
    enabled: !!userId && !!schoolId,
  });
}

/**
 * Get the student record for a student user
 */
export function useStudentSelf(userId: string | undefined) {
  return useQuery({
    queryKey: ['student-self', userId],
    queryFn: async (): Promise<ParentStudentLink | null> => {
      if (!userId) return null;

      const student = await fetchStudentByUserId(userId);
      if (!student) return null;

      return {
        studentId: student.id,
        studentName: student.name,
        classId: student.class_id,
      };
    },
    enabled: !!userId,
  });
}

// =============================================================================
// MAIN SCOPE CONTEXT HOOK
// =============================================================================

/**
 * Build the complete scope context for the current user
 */
export function useDataScopeContext(): {
  context: ScopeContext | null;
  isLoading: boolean;
  assignedClasses: TeacherClassAssignment[];
  linkedStudents: ParentStudentLink[];
} {
  const rbac = useRBACContext();
  const activeRole = rbac.activeRole || (rbac.roles[0] as AppRole) || null;

  // Fetch scope data based on role
  const { data: teacherClasses = [], isLoading: classesLoading } = useTeacherAssignedClasses(
    activeRole === 'teacher' ? rbac.userId ?? undefined : undefined,
    rbac.schoolId ?? undefined
  );

  const { data: parentStudents = [], isLoading: studentsLoading } = useParentLinkedStudents(
    activeRole === 'parent' ? rbac.userId ?? undefined : undefined,
    rbac.schoolId ?? undefined
  );

  const { data: studentSelf, isLoading: selfLoading } = useStudentSelf(
    activeRole === 'student' ? rbac.userId ?? undefined : undefined
  );

  const isLoading = classesLoading || studentsLoading || selfLoading;

  const context = useMemo((): ScopeContext | null => {
    if (!activeRole) return null;

    // Build linked student IDs based on role
    let linkedStudentIds: string[] = [];
    if (activeRole === 'parent') {
      linkedStudentIds = parentStudents.map(s => s.studentId);
    } else if (activeRole === 'student' && studentSelf) {
      linkedStudentIds = [studentSelf.studentId];
    }

    return {
      role: activeRole,
      activeRole,
      schoolId: rbac.schoolId,
      assignedClassIds: teacherClasses.map(c => c.classId),
      linkedStudentIds,
      userId: rbac.userId,
    };
  }, [activeRole, rbac.schoolId, rbac.userId, teacherClasses, parentStudents, studentSelf]);

  return {
    context,
    isLoading,
    assignedClasses: teacherClasses,
    linkedStudents: activeRole === 'parent' ? parentStudents : studentSelf ? [studentSelf] : [],
  };
}

// =============================================================================
// SCOPE VALIDATION HOOKS
// =============================================================================

/**
 * Hook for validating scope access
 */
export function useScopeValidation() {
  const { context } = useDataScopeContext();

  const validateSchool = useCallback(
    (schoolId: string): ScopeValidation => {
      if (!context) {
        return { valid: false, reason: 'No scope context available' };
      }
      return canAccessSchool(context, schoolId);
    },
    [context]
  );

  const validateClass = useCallback(
    (classId: string): ScopeValidation => {
      if (!context) {
        return { valid: false, reason: 'No scope context available' };
      }
      return canAccessClass(context, classId);
    },
    [context]
  );

  const validateStudent = useCallback(
    (studentId: string): ScopeValidation => {
      if (!context) {
        return { valid: false, reason: 'No scope context available' };
      }
      return canAccessStudent(context, studentId);
    },
    [context]
  );

  return {
    validateSchool,
    validateClass,
    validateStudent,
  };
}

/**
 * Hook for checking entity-specific access
 */
export function useEntityAccess() {
  const { context } = useDataScopeContext();

  const checkUploadAccess = useCallback(
    (classId: string | null): boolean => {
      if (!context) return false;
      return canAccessUpload(context, classId);
    },
    [context]
  );

  const checkAttendanceAccess = useCallback(
    (classId: string, studentId?: string): boolean => {
      if (!context) return false;
      return canAccessAttendance(context, classId, studentId);
    },
    [context]
  );

  const checkFeesAccess = useCallback(
    (studentId?: string): boolean => {
      if (!context) return false;
      return canAccessFees(context, studentId);
    },
    [context]
  );

  const checkAIContentAccess = useCallback(
    (classId?: string, studentId?: string): boolean => {
      if (!context) return false;
      return canAccessAIContent(context, classId, studentId);
    },
    [context]
  );

  return {
    checkUploadAccess,
    checkAttendanceAccess,
    checkFeesAccess,
    checkAIContentAccess,
  };
}

// =============================================================================
// SCOPE ASSERTION HOOK
// =============================================================================

/**
 * Hook for asserting scope before actions
 */
export function useScopeAssertion() {
  const { context } = useDataScopeContext();
  const { logScopeViolation } = useLogScopeViolation();

  const assert = useCallback(
    (options: {
      action: string;
      entityType: string;
      schoolId?: string;
      classId?: string;
      studentId?: string;
    }) => {
      if (!context) {
        const violation: ScopeViolation = {
          attemptedAction: options.action,
          entityType: options.entityType,
          requiredScope: 'school',
          userScope: 'school',
          reason: 'No scope context available',
          timestamp: new Date().toISOString(),
        };
        logScopeViolation(violation);
        throw new ScopeViolationError('Scope context not available', violation);
      }

      try {
        assertScope({
          context,
          ...options,
        });
      } catch (error) {
        if (error instanceof ScopeViolationError) {
          logScopeViolation(error.violation);
        }
        throw error;
      }
    },
    [context, logScopeViolation]
  );

  return { assert };
}

// =============================================================================
// SCOPE FILTERS HOOK
// =============================================================================

/**
 * Get query filters based on current scope
 */
export function useScopeFilters() {
  const { context } = useDataScopeContext();

  return useMemo(() => {
    if (!context) {
      return {
        schoolFilter: null,
        classFilter: null,
        studentFilter: null,
      };
    }
    return getScopeFilters(context);
  }, [context]);
}

// =============================================================================
// SCOPE VIOLATION LOGGING
// =============================================================================

/**
 * Log scope violations to audit log
 */
export function useLogScopeViolation() {
  const { toast } = useToast();
  const rbac = useRBACContext();

  const logScopeViolation = useCallback(
    async (violation: ScopeViolation) => {
      try {
        const roleUsed = rbac.activeRole ?? 'teacher'; // Default to safe role for logging
        // Log to system_audit_logs with scope information
        await supabase.rpc('log_sensitive_action', {
          p_user_id: rbac.userId ?? 'unknown',
          p_user_name: rbac.userName,
          p_school_id: rbac.schoolId ?? 'unknown',
          p_role_used: roleUsed as AppRole,
          p_action: `scope_violation:${violation.attemptedAction}`,
          p_action_category: 'security',
          p_entity_type: violation.entityType,
          p_entity_id: violation.entityId ?? null,
          p_details: JSON.parse(JSON.stringify({
            required_scope: violation.requiredScope,
            user_scope: violation.userScope,
            denied_reason: violation.reason,
            timestamp: violation.timestamp,
          })),
          p_success: false,
          p_failure_reason: violation.reason,
        });
      } catch (error) {
        console.error('Failed to log scope violation:', error);
      }

      // Show toast to user
      toast({
        title: 'Access Restricted',
        description: 'You do not have permission to access this data.',
        variant: 'destructive',
      });
    },
    [rbac, toast]
  );

  return { logScopeViolation };
}

// =============================================================================
// SCOPED QUERY HOOKS
// =============================================================================

/**
 * Get classes with scope filtering applied
 */
export function useScopedClasses() {
  const { context, isLoading: scopeLoading } = useDataScopeContext();
  const rbac = useRBACContext();

  return useQuery({
    queryKey: ['scoped-classes', rbac.schoolId, context?.assignedClassIds],
    queryFn: async () => {
      if (!context || !context.schoolId) return [];
      /* eslint-disable @typescript-eslint/no-explicit-any */
      let q = (supabase as any).from('classes').select('*').eq('school_id', context.schoolId).is('deleted_at', null);
      if (context.role === 'teacher' && context.assignedClassIds.length > 0) {
        q = q.in('id', context.assignedClassIds);
      }
      const result = await q.order('name');
      /* eslint-enable @typescript-eslint/no-explicit-any */
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !scopeLoading && !!context?.schoolId,
  });
}

export function useScopedStudents(classId?: string) {
  const { context, isLoading: scopeLoading } = useDataScopeContext();
  const rbac = useRBACContext();

  return useQuery({
    queryKey: ['scoped-students', rbac.schoolId, classId, context?.linkedStudentIds],
    queryFn: async () => {
      if (!context || !context.schoolId) return [];
      if (classId && !canAccessClass(context, classId).valid) return [];
      
      const studentIds = ['parent', 'student'].includes(context.role) ? context.linkedStudentIds : undefined;
      const classIds = context.role === 'teacher' && !classId ? context.assignedClassIds : undefined;
      
      return fetchScopedStudents({ schoolId: context.schoolId, classId, studentIds, classIds });
    },
    enabled: !scopeLoading && !!context?.schoolId,
  });
}

export function useScopedUploads(classId?: string) {
  const { context, isLoading: scopeLoading } = useDataScopeContext();
  const rbac = useRBACContext();

  return useQuery({
    queryKey: ['scoped-uploads', rbac.schoolId, classId, context?.assignedClassIds],
    queryFn: async () => {
      if (!context || !context.schoolId) return [];
      if (classId && !canAccessUpload(context, classId)) return [];
      
      const classIds = context.role === 'teacher' && !classId ? context.assignedClassIds : undefined;
      return fetchScopedUploads({ schoolId: context.schoolId, classId, classIds });
    },
    enabled: !scopeLoading && !!context?.schoolId,
  });
}
