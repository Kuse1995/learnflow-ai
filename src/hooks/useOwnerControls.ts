/**
 * Owner Controls Hooks
 * 
 * Hooks for system-level controls only available to the Platform Owner.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

// =============================================================================
// SYSTEM MODE
// =============================================================================

export type SystemMode = 'demo' | 'production';

export function useSystemMode() {
  return useQuery({
    queryKey: ['system-mode'],
    queryFn: async (): Promise<SystemMode> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('key', 'demo_mode')
        .single();

      if (error) return 'demo'; // Default to demo if not found
      return data?.enabled ? 'demo' : 'production';
    },
  });
}

export function useToggleSystemMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: SystemMode) => {
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          key: 'demo_mode',
          enabled: mode === 'demo',
          description: 'Global demo mode toggle',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
      return mode;
    },
    onSuccess: (mode) => {
      queryClient.invalidateQueries({ queryKey: ['system-mode'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success(`System mode changed to ${mode}`);
    },
    onError: (error) => {
      toast.error('Failed to change system mode: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// FEATURE FLAGS
// =============================================================================

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

export function useFeatureFlagsControl() {
  return useQuery({
    queryKey: ['feature-flags-control'],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, key, enabled, description')
        .order('key');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          key,
          enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
      return { key, enabled };
    },
    onSuccess: ({ key, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flags-control'] });
      toast.success(`${key} ${enabled ? 'enabled' : 'disabled'}`);
    },
    onError: (error) => {
      toast.error('Failed to toggle feature: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// CLEAR ANALYTICS
// =============================================================================

export function useClearAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear demo-related analytics
      const { error: usageError } = await supabase
        .from('school_usage_metrics')
        .delete()
        .not('id', 'is', null); // Delete all

      if (usageError) throw usageError;

      const { error: adoptionError } = await supabase
        .from('feature_adoption_events')
        .delete()
        .not('id', 'is', null);

      if (adoptionError) throw adoptionError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['usage-metrics'] });
      toast.success('Analytics cleared successfully');
    },
    onError: (error) => {
      toast.error('Failed to clear analytics: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// PENDING COUNTS
// =============================================================================

interface PendingCounts {
  adaptivePlans: number;
  parentInsights: number;
}

export function usePendingCounts() {
  return useQuery({
    queryKey: ['owner-pending-counts'],
    queryFn: async (): Promise<PendingCounts> => {
      const [plansRes, insightsRes] = await Promise.all([
        supabase
          .from('adaptive_support_plans')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_acknowledged', false),
        supabase
          .from('parent_insight_summaries')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_approved', false),
      ]);

      return {
        adaptivePlans: plansRes.count || 0,
        parentInsights: insightsRes.count || 0,
      };
    },
  });
}

// =============================================================================
// SYSTEM HEALTH
// =============================================================================

interface SystemHealthData {
  lastErrors: Array<{
    message: string;
    timestamp: string;
    type: string;
  }>;
  featureFlags: Array<{
    key: string;
    enabled: boolean;
  }>;
  databaseStatus: 'healthy' | 'degraded' | 'error';
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async (): Promise<SystemHealthData> => {
      // Get feature flags
      const { data: flags } = await supabase
        .from('feature_flags')
        .select('key, enabled')
        .order('key');

      // Check database connectivity
      const { error: dbError } = await supabase
        .from('schools')
        .select('id', { count: 'exact', head: true });

      return {
        lastErrors: [], // Would be populated from analytics logs
        featureFlags: flags || [],
        databaseStatus: dbError ? 'error' : 'healthy',
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// =============================================================================
// DELETE MUTATIONS FOR PENDING ITEMS
// =============================================================================

export function useDeleteAdaptivePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('adaptive_support_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-adaptive-support-plans-all'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pending-counts'] });
      toast.success('Adaptive support plan deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete plan: ' + (error as Error).message);
    },
  });
}

export function useDeleteParentInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('parent_insight_summaries')
        .delete()
        .eq('id', insightId);

      if (error) throw error;
      return insightId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-parent-insights-all'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pending-counts'] });
      toast.success('Parent insight deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete insight: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// SCHOOL MANAGEMENT
// =============================================================================

interface SchoolWithPlan {
  id: string;
  name: string;
  is_demo: boolean;
  billing_status: string | null;
  created_at: string;
  subscription?: {
    plan?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export function useAllSchoolsWithPlans() {
  return useQuery({
    queryKey: ['owner-all-schools'],
    queryFn: async (): Promise<SchoolWithPlan[]> => {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          is_demo,
          billing_status,
          created_at,
          subscription:school_subscriptions(
            plan:plans(id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((school: any) => ({
        ...school,
        subscription: school.subscription?.[0] || null,
      }));
    },
  });
}

export function useAvailablePlans() {
  return useQuery({
    queryKey: ['available-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, display_name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

interface AdminAssignment {
  id?: string;  // User ID if they exist
  email: string;
}

interface CreateSchoolInput {
  name: string;
  planId?: string;
  billingPeriod?: 'monthly' | 'termly' | 'annual';
  isDemo: boolean;
  billingStatus: string;
  country?: string;
  timezone?: string;
  admins?: AdminAssignment[];  // Changed from adminUserIds to support pending invitations
}

export function useCreateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSchoolInput) => {
      // Use type assertion since country/timezone columns were just added
      const { data: school, error } = await supabase
        .from('schools')
        .insert({
          name: input.name,
          is_demo: input.isDemo,
          billing_status: input.billingStatus,
          billing_start_date: new Date().toISOString(),
          billing_end_date: addDays(new Date(), 14).toISOString(),
          country: input.country || 'Zambia',
          timezone: input.timezone || 'Africa/Lusaka',
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Create subscription if plan selected
      if (input.planId && school) {
        await supabase.from('school_subscriptions').insert({
          school_id: school.id,
          plan_id: input.planId,
          status: 'active',
          billing_period: input.billingPeriod || 'monthly',
        } as any);
      }

      // Assign admins if provided - handle both existing users and pending invitations
      if (input.admins && input.admins.length > 0 && school) {
        const existingUserAdmins = input.admins.filter(a => a.id);
        const pendingAdmins = input.admins.filter(a => !a.id);

        // Assign roles to existing users
        if (existingUserAdmins.length > 0) {
          const adminRoles = existingUserAdmins.map(admin => ({
            user_id: admin.id!,
            school_id: school.id,
            role: 'school_admin' as AppRole,
          }));
          
          const { error: roleError } = await supabase.from('user_roles').insert(adminRoles);
          if (roleError) {
            console.error('Failed to assign admin roles:', roleError);
            throw new Error(`School created but failed to assign admins: ${roleError.message}`);
          }
        }

        // Create pending invitations for unregistered users
        if (pendingAdmins.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          const pendingInvitations = pendingAdmins.map(admin => ({
            school_id: school.id,
            email: admin.email.toLowerCase().trim(),
            role: 'school_admin' as AppRole,
            invited_by: user?.id,
          }));

          const { error: inviteError } = await supabase.from('pending_admin_invitations').insert(pendingInvitations);
          if (inviteError) {
            console.error('Failed to create pending invitations:', inviteError);
            // Don't throw - school and existing admins are already created
            toast.error(`School created but some invitations failed: ${inviteError.message}`);
          }
        }

        // Seed default subjects for the school
        const defaultSubjects = [
          { name: 'Mathematics', code: 'MATH', category: 'core', sort_order: 1, school_id: school.id },
          { name: 'English', code: 'ENG', category: 'core', sort_order: 2, school_id: school.id },
          { name: 'Science', code: 'SCI', category: 'core', sort_order: 3, school_id: school.id },
          { name: 'Social Studies', code: 'SS', category: 'core', sort_order: 4, school_id: school.id },
          { name: 'Creative Arts', code: 'CA', category: 'elective', sort_order: 5, school_id: school.id },
          { name: 'Physical Education', code: 'PE', category: 'elective', sort_order: 6, school_id: school.id },
          { name: 'Religious Education', code: 'RE', category: 'elective', sort_order: 7, school_id: school.id },
          { name: 'Local Language', code: 'LL', category: 'elective', sort_order: 8, school_id: school.id },
          { name: 'Technology Studies', code: 'TECH', category: 'elective', sort_order: 9, school_id: school.id },
          { name: 'Home Economics', code: 'HE', category: 'vocational', sort_order: 10, school_id: school.id },
        ];

        await supabase.from('school_subjects').insert(defaultSubjects as any);
      }

      return school;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-schools'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-schools'] });
      queryClient.invalidateQueries({ queryKey: ['owner-all-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['pending-admin-invitations'] });
      toast.success('School created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create school: ' + (error as Error).message);
    },
  });
}

export function useSuspendSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      const { error } = await supabase
        .from('schools')
        .update({ billing_status: 'suspended' })
        .eq('id', schoolId);

      if (error) throw error;
      return schoolId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-schools'] });
      toast.success('School suspended');
    },
    onError: (error) => {
      toast.error('Failed to suspend school: ' + (error as Error).message);
    },
  });
}

export function useReinstateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      const { error } = await supabase
        .from('schools')
        .update({ billing_status: 'active' })
        .eq('id', schoolId);

      if (error) throw error;
      return schoolId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-schools'] });
      toast.success('School reinstated');
    },
    onError: (error) => {
      toast.error('Failed to reinstate school: ' + (error as Error).message);
    },
  });
}

export function useDeleteSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, archivedBy }: { schoolId: string; archivedBy?: string }) => {
      // Call the cascade archive function that handles all related data
      const { error } = await supabase.rpc('archive_school_cascade', {
        p_school_id: schoolId,
        p_archived_by: archivedBy || null
      });

      if (error) throw error;
      return schoolId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-schools'] });
      queryClient.invalidateQueries({ queryKey: ['owner-all-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['owner-all-classes'] });
      toast.success('School and all related data archived');
    },
    onError: (error) => {
      toast.error('Failed to archive school: ' + (error as Error).message);
    },
  });
}

export function useHardDeleteSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      // Step 1: Delete auth users associated with this school
      // This edge function deletes users from auth.users if they only belong to this school
      const { data: userDeleteResult, error: userDeleteError } = await supabase.functions.invoke(
        'delete-school-users',
        {
          body: { school_id: schoolId },
        }
      );

      if (userDeleteError) {
        console.error('Error deleting school users:', userDeleteError);
        // Continue with cascade even if user deletion fails - those users will be orphaned
        // but won't block the school deletion
        toast.error('Warning: Some user accounts may not have been deleted');
      } else {
        console.log('User deletion result:', userDeleteResult);
      }

      // Step 2: Call the hard delete cascade function that permanently deletes all data
      const { error } = await supabase.rpc('hard_delete_school_cascade', {
        p_school_id: schoolId,
      });

      if (error) throw error;
      return schoolId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-schools'] });
      queryClient.invalidateQueries({ queryKey: ['owner-all-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['owner-all-classes'] });
      toast.success('School and all data permanently deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete school: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// USER ROLE MANAGEMENT
// =============================================================================

interface UserRole {
  id: string;
  user_id: string;
  user_email?: string;
  school_id: string;
  role: AppRole;
  created_at: string;
  school?: { name: string } | null;
}

export function useAllUsersWithRoles() {
  return useQuery({
    queryKey: ['owner-all-user-roles'],
    queryFn: async (): Promise<UserRole[]> => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          school_id,
          role,
          created_at,
          school:schools(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Get user emails from profiles table (not demo_users)
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      
      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
      
      return (data || []).map(role => ({
        ...role,
        user_email: emailMap.get(role.user_id) || undefined,
      }));
    },
  });
}

// Hook to get all registered users for admin assignment
export function useAllRegisteredUsers() {
  return useQuery({
    queryKey: ['all-registered-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');
      
      if (error) throw error;
      return data || [];
    },
  });
}

interface AssignRoleInput {
  userId: string;
  schoolId: string;
  role: AppRole;
}

export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignRoleInput) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: input.userId,
          school_id: input.schoolId,
          role: input.role,
        });

      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-user-roles'] });
      toast.success('Role assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign role: ' + (error as Error).message);
    },
  });
}

export function useRevokeRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      return roleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-user-roles'] });
      toast.success('Role revoked');
    },
    onError: (error) => {
      toast.error('Failed to revoke role: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// CLASS MANAGEMENT
// =============================================================================

interface ClassWithSchool {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  is_demo: boolean;
  created_at: string;
  school?: { name: string } | null;
}

export function useAllClasses() {
  return useQuery({
    queryKey: ['owner-all-classes'],
    queryFn: async (): Promise<ClassWithSchool[]> => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          grade,
          section,
          is_demo,
          created_at,
          school:schools(name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });
}

interface CreateClassInput {
  name: string;
  schoolId: string;
  grade?: string;
  section?: string;
  subject?: string;
  isDemo: boolean;
}

export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClassInput) => {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: input.name,
          school_id: input.schoolId,
          grade: input.grade || null,
          section: input.section || null,
          subject: input.subject || null,
          is_demo: input.isDemo,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-classes'] });
      toast.success('Class created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create class: ' + (error as Error).message);
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', classId);

      if (error) throw error;
      return classId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-classes'] });
      toast.success('Class deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete class: ' + (error as Error).message);
    },
  });
}

// =============================================================================
// SCHOOL SUBJECTS
// =============================================================================

interface SchoolSubject {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

export function useSchoolSubjects(schoolId: string) {
  return useQuery({
    queryKey: ['school-subjects', schoolId],
    queryFn: async (): Promise<SchoolSubject[]> => {
      // Use type assertion since school_subjects table was just added
      const { data, error } = await (supabase
        .from('school_subjects' as any)
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order') as any);

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
}

interface CreateSubjectInput {
  schoolId: string;
  name: string;
  code?: string;
  category?: string;
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubjectInput) => {
      // Use type assertion since school_subjects table was just added
      const { data, error } = await (supabase
        .from('school_subjects' as any)
        .insert({
          school_id: input.schoolId,
          name: input.name,
          code: input.code || null,
          category: input.category || 'custom',
        } as any)
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-subjects', variables.schoolId] });
      toast.success('Subject added');
    },
    onError: (error) => {
      toast.error('Failed to add subject: ' + (error as Error).message);
    },
  });
}
