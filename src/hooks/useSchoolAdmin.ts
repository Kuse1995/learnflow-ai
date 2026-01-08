/**
 * School Admin Governance Hooks
 * For head teachers, school administrators, and academic coordinators
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDemoMode, DEMO_USERS } from "@/contexts/DemoModeContext";
import { isPlatformOwnerEmail } from "@/hooks/usePlatformOwner";

// Types
export interface SchoolAdminOnboarding {
  id: string;
  user_id: string;
  school_id: string;
  completed_at: string | null;
  current_step: number;
  steps_completed: string[];
  created_at: string;
}

export interface ManualPlanAssignment {
  id: string;
  school_id: string;
  plan_type: "starter" | "standard" | "premium";
  duration_type: "monthly" | "term" | "annual";
  start_date: string;
  end_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  internal_notes: string | null;
  is_active: boolean;
  paused_at: string | null;
  paused_reason: string | null;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolSystemHistory {
  id: string;
  school_id: string;
  action_type: string;
  action_description: string;
  performed_by: string;
  performed_by_role: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  created_at: string;
}

export interface SchoolAdminMetrics {
  id: string;
  school_id: string;
  active_teachers_count: number;
  active_classes_count: number;
  uploads_this_term: number;
  parent_insights_approved_count: number;
  adaptive_plans_generated_count: number;
  last_calculated_at: string;
}

// Check if current user is a school admin
export function useIsSchoolAdmin(schoolId?: string) {
  const { isDemoMode, demoRole } = useDemoMode();
  
  return useQuery({
    queryKey: ["is-school-admin", schoolId, isDemoMode, demoRole],
    queryFn: async (): Promise<boolean> => {
      // In demo mode, check if the demo role is school_admin
      if (isDemoMode && demoRole) {
        return demoRole === 'school_admin';
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Platform owner has universal access
      if (isPlatformOwnerEmail(user.email)) {
        return true;
      }

      const query = supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .in("role", ["platform_admin", "school_admin", "admin"]);

      if (schoolId) {
        query.eq("school_id", schoolId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Error checking school admin status:", error);
        return false;
      }

      return !!data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get school admin's school ID
export function useSchoolAdminSchool() {
  const { isDemoMode, demoRole, demoSchoolId } = useDemoMode();
  
  return useQuery({
    queryKey: ["school-admin-school", isDemoMode, demoSchoolId],
    queryFn: async () => {
      // In demo mode, return the demo school
      if (isDemoMode && demoRole === 'school_admin' && demoSchoolId) {
        const { data: school } = await supabase
          .from("schools")
          .select("*")
          .eq("id", demoSchoolId)
          .single();
        return school;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Platform owner: return first non-demo school, or demo school if none
      if (isPlatformOwnerEmail(user.email)) {
        const { data: schools } = await supabase
          .from("schools")
          .select("*")
          .eq("is_demo", false)
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (schools && schools.length > 0) {
          return schools[0];
        }
        
        // Fallback to demo school
        const { data: demoSchool } = await supabase
          .from("schools")
          .select("*")
          .eq("is_demo", true)
          .limit(1)
          .single();
        return demoSchool;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .in("role", ["platform_admin", "school_admin", "admin"])
        .maybeSingle();

      if (error || !data?.school_id) return null;

      // Get school details
      const { data: school } = await supabase
        .from("schools")
        .select("*")
        .eq("id", data.school_id)
        .single();

      return school;
    },
  });
}

// School Admin Onboarding
export function useSchoolAdminOnboarding() {
  return useQuery({
    queryKey: ["school-admin-onboarding"],
    queryFn: async (): Promise<SchoolAdminOnboarding | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("school_admin_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as SchoolAdminOnboarding | null;
    },
  });
}

export function useUpdateSchoolAdminOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { current_step?: number; steps_completed?: string[]; completed_at?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("school_admin_onboarding")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-admin-onboarding"] });
    },
  });
}

export function useCreateSchoolAdminOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("school_admin_onboarding")
        .insert({
          user_id: user.id,
          school_id: schoolId,
          current_step: 1,
          steps_completed: [],
        });

      if (error && error.code !== "23505") throw error; // Ignore duplicate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-admin-onboarding"] });
    },
  });
}

// Dashboard Metrics
export function useSchoolAdminMetrics(schoolId?: string) {
  return useQuery({
    queryKey: ["school-admin-metrics", schoolId],
    queryFn: async (): Promise<SchoolAdminMetrics | null> => {
      if (!schoolId) return null;

      // Try to get cached metrics
      const { data: cached } = await supabase
        .from("school_admin_metrics")
        .select("*")
        .eq("school_id", schoolId)
        .maybeSingle();

      if (cached) {
        return cached as SchoolAdminMetrics;
      }

      // Calculate fresh metrics
      const [classesResult, teachersResult, uploadsResult, insightsResult, plansResult] = await Promise.all([
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId).is("deleted_at", null),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("role", "teacher"),
        supabase.from("school_usage_metrics").select("uploads_analyzed").eq("school_id", schoolId),
        supabase.from("parent_insight_summaries").select("id", { count: "exact", head: true }).eq("teacher_approved", true),
        supabase.from("school_usage_metrics").select("adaptive_support_plans_generated").eq("school_id", schoolId),
      ]);

      return {
        id: "",
        school_id: schoolId,
        active_classes_count: classesResult.count || 0,
        active_teachers_count: teachersResult.count || 0,
        uploads_this_term: uploadsResult.data?.reduce((sum, r) => sum + (r.uploads_analyzed || 0), 0) || 0,
        parent_insights_approved_count: insightsResult.count || 0,
        adaptive_plans_generated_count: plansResult.data?.reduce((sum, r) => sum + (r.adaptive_support_plans_generated || 0), 0) || 0,
        last_calculated_at: new Date().toISOString(),
      };
    },
    enabled: !!schoolId,
  });
}

// Manual Plan Management
export function useManualPlanAssignments(schoolId?: string) {
  return useQuery({
    queryKey: ["manual-plan-assignments", schoolId],
    queryFn: async (): Promise<ManualPlanAssignment[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("manual_plan_assignments")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ManualPlanAssignment[];
    },
    enabled: !!schoolId,
  });
}

export function useAssignPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: {
      school_id: string;
      plan_type: "starter" | "standard" | "premium";
      duration_type: "monthly" | "term" | "annual";
      start_date?: string;
      end_date?: string | null;
      payment_method?: string;
      payment_reference?: string;
      internal_notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Deactivate previous active plans
      await supabase
        .from("manual_plan_assignments")
        .update({ is_active: false })
        .eq("school_id", assignment.school_id)
        .eq("is_active", true);

      // Create new assignment
      const { error } = await supabase
        .from("manual_plan_assignments")
        .insert({
          ...assignment,
          assigned_by: user.id,
          start_date: assignment.start_date || new Date().toISOString().split("T")[0],
        });

      if (error) throw error;

      // Log to system history
      await supabase.rpc("log_school_history", {
        p_school_id: assignment.school_id,
        p_action_type: "plan_assigned",
        p_action_description: `Plan assigned: ${assignment.plan_type} (${assignment.duration_type})`,
        p_new_state: JSON.parse(JSON.stringify(assignment)),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-plan-assignments"] });
      toast.success("Plan assigned successfully");
    },
    onError: (error) => {
      toast.error("Failed to assign plan: " + error.message);
    },
  });
}

export function usePausePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, reason }: { assignmentId: string; reason: string }) => {
      const { error } = await supabase
        .from("manual_plan_assignments")
        .update({
          paused_at: new Date().toISOString(),
          paused_reason: reason,
        })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-plan-assignments"] });
      toast.success("Plan access paused");
    },
  });
}

export function useResumePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("manual_plan_assignments")
        .update({
          paused_at: null,
          paused_reason: null,
        })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-plan-assignments"] });
      toast.success("Plan access resumed");
    },
  });
}

// System History (Read-Only)
export function useSchoolSystemHistory(schoolId?: string, limit = 50) {
  return useQuery({
    queryKey: ["school-system-history", schoolId, limit],
    queryFn: async (): Promise<SchoolSystemHistory[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("school_system_history")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SchoolSystemHistory[];
    },
    enabled: !!schoolId,
  });
}

// Teacher Role Management
export function useSchoolTeachers(schoolId?: string) {
  return useQuery({
    queryKey: ["school-teachers", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("school_id", schoolId)
        .eq("role", "teacher");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });
}

// Teachers with class counts and profile info
export interface TeacherWithDetails {
  user_id: string;
  full_name: string | null;
  email: string | null;
  class_count: number;
}

export function useSchoolTeachersWithClasses(schoolId?: string) {
  return useQuery({
    queryKey: ["school-teachers-with-classes", schoolId],
    queryFn: async (): Promise<TeacherWithDetails[]> => {
      if (!schoolId) return [];

      // Get all teachers for this school
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .eq("is_active", true);

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const teacherIds = roles.map(r => r.user_id);

      // Get class counts for each teacher
      const { data: classes, error: classesError } = await supabase
        .from("classes")
        .select("teacher_id")
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .in("teacher_id", teacherIds);

      if (classesError) throw classesError;

      // Count classes per teacher
      const classCountMap = new Map<string, number>();
      classes?.forEach(c => {
        if (c.teacher_id) {
          classCountMap.set(c.teacher_id, (classCountMap.get(c.teacher_id) || 0) + 1);
        }
      });

      // Get profiles for teachers (try demo_users first, then create placeholder)
      const { data: demoUsers } = await supabase
        .from("demo_users")
        .select("id, full_name, email")
        .in("id", teacherIds);

      const demoUserMap = new Map(demoUsers?.map(u => [u.id, u]) || []);

      return teacherIds.map(userId => ({
        user_id: userId,
        full_name: demoUserMap.get(userId)?.full_name || null,
        email: demoUserMap.get(userId)?.email || null,
        class_count: classCountMap.get(userId) || 0,
      }));
    },
    enabled: !!schoolId,
  });
}

// Teacher Invitations
export interface TeacherInvitation {
  id: string;
  school_id: string;
  email: string;
  full_name: string | null;
  status: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
}

export function useTeacherInvitations(schoolId?: string) {
  return useQuery({
    queryKey: ["teacher-invitations", schoolId],
    queryFn: async (): Promise<TeacherInvitation[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("teacher_invitations")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TeacherInvitation[];
    },
    enabled: !!schoolId,
  });
}

export function useInviteTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, email, fullName }: { schoolId: string; email: string; fullName?: string }) => {
      const { data, error } = await supabase.functions.invoke("send-teacher-invite", {
        body: { schoolId, email, fullName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-invitations"] });
      toast.success(data?.message || "Invitation sent successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("teacher_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-invitations"] });
      toast.success("Invitation cancelled");
    },
    onError: () => {
      toast.error("Failed to cancel invitation");
    },
  });
}

export function useRemoveTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, schoolId }: { userId: string; schoolId: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("school_id", schoolId)
        .eq("role", "teacher");

      if (error) throw error;

      // Log to system history
      await supabase.rpc("log_school_history", {
        p_school_id: schoolId,
        p_action_type: "teacher_removed",
        p_action_description: "Teacher removed from school",
        p_new_state: { user_id: userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-teachers-with-classes"] });
      toast.success("Teacher removed from school");
    },
    onError: () => {
      toast.error("Failed to remove teacher");
    },
  });
}

// School Classes with details
export interface ClassWithDetails {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  subject: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  student_count: number;
  deleted_at: string | null;
}

export function useSchoolClassesWithDetails(schoolId?: string) {
  return useQuery({
    queryKey: ["school-classes-with-details", schoolId],
    queryFn: async (): Promise<ClassWithDetails[]> => {
      if (!schoolId) return [];

      const { data: classes, error } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      if (!classes) return [];

      // Get teacher names
      const teacherIds = classes.filter(c => c.teacher_id).map(c => c.teacher_id!);
      const { data: demoUsers } = await supabase
        .from("demo_users")
        .select("id, full_name")
        .in("id", teacherIds);

      const teacherMap = new Map(demoUsers?.map(u => [u.id, u.full_name]) || []);

      // Get student counts
      const classIds = classes.map(c => c.id);
      const { data: students } = await supabase
        .from("students")
        .select("class_id")
        .in("class_id", classIds);

      const studentCountMap = new Map<string, number>();
      students?.forEach(s => {
        if (s.class_id) {
          studentCountMap.set(s.class_id, (studentCountMap.get(s.class_id) || 0) + 1);
        }
      });

      return classes.map(c => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        section: c.section,
        subject: c.subject,
        teacher_id: c.teacher_id,
        teacher_name: c.teacher_id ? teacherMap.get(c.teacher_id) || null : null,
        student_count: studentCountMap.get(c.id) || 0,
        deleted_at: c.deleted_at,
      }));
    },
    enabled: !!schoolId,
  });
}

export function useCreateSchoolClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, name, grade, section, subject }: {
      schoolId: string;
      name: string;
      grade?: string;
      section?: string;
      subject?: string;
    }) => {
      const { error } = await supabase
        .from("classes")
        .insert({
          school_id: schoolId,
          name,
          grade: grade || null,
          section: section || null,
          subject: subject || null,
        });

      if (error) throw error;

      // Log to system history
      await supabase.rpc("log_school_history", {
        p_school_id: schoolId,
        p_action_type: "class_created",
        p_action_description: `Class "${name}" created`,
        p_new_state: { name, grade, section, subject },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-classes-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class created successfully");
    },
    onError: () => {
      toast.error("Failed to create class");
    },
  });
}

export function useAssignTeacherToClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, teacherId }: { classId: string; teacherId: string }) => {
      const { error } = await supabase
        .from("classes")
        .update({ teacher_id: teacherId })
        .eq("id", classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-classes-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["school-teachers-with-classes"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Teacher assigned to class");
    },
    onError: () => {
      toast.error("Failed to assign teacher");
    },
  });
}

export function useArchiveClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("classes")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id || null,
        })
        .eq("id", classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-classes-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class archived");
    },
    onError: () => {
      toast.error("Failed to archive class");
    },
  });
}

export function useAssignTeacherRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, schoolId }: { userId: string; schoolId: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          school_id: schoolId,
          role: "teacher",
        });

      if (error) throw error;

      // Log to system history
      await supabase.rpc("log_school_history", {
        p_school_id: schoolId,
        p_action_type: "teacher_role_assigned",
        p_action_description: "Teacher role assigned to user",
        p_new_state: { user_id: userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      toast.success("Teacher role assigned");
    },
  });
}
