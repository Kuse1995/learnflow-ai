import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ParentPermissionTier, 
  ParentPermission, 
  getPermissionsForTier,
  DEFAULT_PERMISSION,
  ParentFeature
} from '@/lib/parent-permissions';

interface ParentPermissionRow {
  id: string;
  guardian_id: string;
  student_id: string;
  permission_tier: ParentPermissionTier;
  can_view_attendance: boolean;
  can_view_learning_updates: boolean;
  can_view_approved_insights: boolean;
  can_receive_notifications: boolean;
  can_view_fees: boolean;
  can_view_reports: boolean;
  can_view_timetables: boolean;
  can_request_meetings: boolean;
  created_at: string;
  updated_at: string;
  granted_by: string | null;
  granted_at: string | null;
}

function toPermission(row: ParentPermissionRow): ParentPermission {
  return {
    guardianId: row.guardian_id,
    studentId: row.student_id,
    tier: row.permission_tier,
    features: {
      canViewAttendance: row.can_view_attendance,
      canViewLearningUpdates: row.can_view_learning_updates,
      canViewApprovedInsights: row.can_view_approved_insights,
      canReceiveNotifications: row.can_receive_notifications,
      canViewFees: row.can_view_fees,
      canViewReports: row.can_view_reports,
      canViewTimetables: row.can_view_timetables,
      canRequestMeetings: row.can_request_meetings,
    },
  };
}

/**
 * Get permissions for a specific guardian-student pair
 */
export function useParentPermission(guardianId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: ['parent-permission', guardianId, studentId],
    queryFn: async () => {
      if (!guardianId || !studentId) return null;
      
      const { data, error } = await supabase
        .from('parent_permissions')
        .select('*')
        .eq('guardian_id', guardianId)
        .eq('student_id', studentId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return toPermission(data as ParentPermissionRow);
    },
    enabled: !!guardianId && !!studentId,
  });
}

/**
 * Get all permissions for a guardian (all their linked students)
 */
export function useGuardianPermissions(guardianId: string | undefined) {
  return useQuery({
    queryKey: ['guardian-permissions', guardianId],
    queryFn: async () => {
      if (!guardianId) return [];
      
      const { data, error } = await supabase
        .from('parent_permissions')
        .select('*')
        .eq('guardian_id', guardianId);
      
      if (error) throw error;
      return (data as ParentPermissionRow[]).map(toPermission);
    },
    enabled: !!guardianId,
  });
}

/**
 * Get all permissions for a student (all their guardians)
 */
export function useStudentGuardianPermissions(studentId: string | undefined) {
  return useQuery({
    queryKey: ['student-guardian-permissions', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from('parent_permissions')
        .select(`
          *,
          guardian:guardians(id, display_name, email, primary_phone)
        `)
        .eq('student_id', studentId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

/**
 * Grant or update permissions for a guardian-student pair
 */
export function useGrantPermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      guardianId,
      studentId,
      tier,
    }: {
      guardianId: string;
      studentId: string;
      tier: ParentPermissionTier;
    }) => {
      const permissions = getPermissionsForTier(tier);
      
      const { data, error } = await supabase
        .from('parent_permissions')
        .upsert({
          guardian_id: guardianId,
          student_id: studentId,
          permission_tier: tier,
          can_view_attendance: permissions.canViewAttendance,
          can_view_learning_updates: permissions.canViewLearningUpdates,
          can_view_approved_insights: permissions.canViewApprovedInsights,
          can_receive_notifications: permissions.canReceiveNotifications,
          can_view_fees: permissions.canViewFees,
          can_view_reports: permissions.canViewReports,
          can_view_timetables: permissions.canViewTimetables,
          can_request_meetings: permissions.canRequestMeetings,
          granted_at: new Date().toISOString(),
        }, {
          onConflict: 'guardian_id,student_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parent-permission', variables.guardianId, variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['guardian-permissions', variables.guardianId] });
      queryClient.invalidateQueries({ queryKey: ['student-guardian-permissions', variables.studentId] });
      toast.success('Permissions updated');
    },
    onError: () => {
      toast.error('Failed to update permissions');
    },
  });
}

/**
 * Revoke all permissions for a guardian-student pair
 */
export function useRevokePermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      guardianId,
      studentId,
    }: {
      guardianId: string;
      studentId: string;
    }) => {
      const { error } = await supabase
        .from('parent_permissions')
        .delete()
        .eq('guardian_id', guardianId)
        .eq('student_id', studentId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parent-permission', variables.guardianId, variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['guardian-permissions', variables.guardianId] });
      queryClient.invalidateQueries({ queryKey: ['student-guardian-permissions', variables.studentId] });
      toast.success('Permissions revoked');
    },
    onError: () => {
      toast.error('Failed to revoke permissions');
    },
  });
}

/**
 * Check if a guardian can access a specific feature for a student
 * Uses the database function for server-side validation
 */
export function useCanAccessFeature() {
  return useMutation({
    mutationFn: async ({
      guardianId,
      studentId,
      feature,
    }: {
      guardianId: string;
      studentId: string;
      feature: ParentFeature;
    }) => {
      const { data, error } = await supabase
        .rpc('parent_can_access', {
          _guardian_id: guardianId,
          _student_id: studentId,
          _feature: feature,
        });
      
      if (error) throw error;
      return data as boolean;
    },
  });
}

/**
 * Get accessible students for a guardian
 */
export function useAccessibleStudents(guardianId: string | undefined) {
  return useQuery({
    queryKey: ['accessible-students', guardianId],
    queryFn: async () => {
      if (!guardianId) return [];
      
      const { data, error } = await supabase
        .rpc('get_guardian_accessible_students', {
          _guardian_id: guardianId,
        });
      
      if (error) throw error;
      return data as { student_id: string; permission_tier: ParentPermissionTier }[];
    },
    enabled: !!guardianId,
  });
}

/**
 * Hook to check current user's parent permissions
 * Used in parent-facing components
 */
export function useCurrentParentPermissions() {
  return useQuery({
    queryKey: ['current-parent-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Get guardian record for current user
      const { data: guardian, error: guardianError } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (guardianError) throw guardianError;
      if (!guardian) return null;
      
      // Get all permissions for this guardian
      const { data: permissions, error: permError } = await supabase
        .from('parent_permissions')
        .select(`
          *,
          student:students(id, name, class_id)
        `)
        .eq('guardian_id', guardian.id);
      
      if (permError) throw permError;
      
      return {
        guardianId: guardian.id,
        permissions: (permissions as ParentPermissionRow[]).map(toPermission),
        students: permissions?.map(p => (p as any).student) || [],
      };
    },
  });
}
