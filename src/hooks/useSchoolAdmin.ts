/**
 * School Admin Governance Hooks
 * For head teachers, school administrators, and academic coordinators
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDemoMode, DEMO_USERS } from "@/contexts/DemoModeContext";

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
