import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  SuperAdmin,
  Plan,
  SchoolSubscription,
  PlatformAiControls,
  PlatformAuditLog,
  PlatformStats,
  ActivatePlanPayload,
  SuspendSchoolPayload,
  ExtendSubscriptionPayload,
  ChangePlanPayload,
  BillingEvent,
  PlatformAuditAction,
} from "@/types/platform-admin";
import { toast } from "sonner";

// Check if current user is a super admin
export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async (): Promise<boolean> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error checking super admin status:", error);
        return false;
      }

      return !!data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Get current super admin details
export function useSuperAdminProfile() {
  return useQuery({
    queryKey: ["super-admin-profile"],
    queryFn: async (): Promise<SuperAdmin | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("super_admins")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as SuperAdmin | null;
    },
  });
}

// Fetch all plans
export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as unknown as Plan[];
    },
  });
}

// Fetch all schools with subscriptions
export function useAllSchools() {
  return useQuery({
    queryKey: ["admin-all-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select(`
          *,
          school_subscriptions (
            *,
            plan:plans (*)
          )
        `)
        .eq("is_archived", false)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

// Fetch platform AI controls
export function usePlatformAiControls() {
  return useQuery({
    queryKey: ["platform-ai-controls"],
    queryFn: async (): Promise<PlatformAiControls | null> => {
      const { data, error } = await supabase
        .from("platform_ai_controls")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as PlatformAiControls | null;
    },
  });
}

// Fetch platform audit logs
export function usePlatformAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ["platform-audit-logs", limit],
    queryFn: async (): Promise<PlatformAuditLog[]> => {
      const { data, error } = await supabase
        .from("platform_audit_logs")
        .select(`
          *,
          actor:super_admins!platform_audit_logs_actor_id_fkey (id, email, name),
          school:schools!platform_audit_logs_target_school_id_fkey (id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as PlatformAuditLog[];
    },
  });
}

// Fetch billing events for a school
export function useSchoolBillingEvents(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-billing-events", schoolId],
    queryFn: async (): Promise<BillingEvent[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("billing_events")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BillingEvent[];
    },
    enabled: !!schoolId,
  });
}

// Fetch platform statistics
export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async (): Promise<PlatformStats> => {
      // Get schools count by status
      const { data: schools, error: schoolsError } = await supabase
        .from("schools")
        .select("id, plan, billing_status, is_archived")
        .eq("is_archived", false);

      if (schoolsError) throw schoolsError;

      // Get subscriptions with plans
      const { data: subscriptions, error: subError } = await supabase
        .from("school_subscriptions")
        .select("status, plan:plans(name)");

      if (subError) throw subError;

      // Get total students
      const { count: studentsCount, error: studentsError } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true });

      if (studentsError) throw studentsError;

      // Get total classes (as proxy for teachers)
      const { count: classesCount, error: classesError } = await supabase
        .from("classes")
        .select("id", { count: "exact", head: true });

      if (classesError) throw classesError;

      // Get AI usage this month
      const monthYear = new Date().toISOString().slice(0, 7);
      const { data: usageData, error: usageError } = await supabase
        .from("school_usage_metrics")
        .select("uploads_analyzed, ai_generations, parent_insights_generated, adaptive_support_plans_generated")
        .eq("month_year", monthYear);

      if (usageError) throw usageError;

      // Aggregate stats
      const schoolsByPlan: Record<string, number> = {};
      subscriptions?.forEach((sub: any) => {
        const planName = sub.plan?.name || "none";
        schoolsByPlan[planName] = (schoolsByPlan[planName] || 0) + 1;
      });

      const aiUsage = usageData?.reduce(
        (acc, m) => ({
          uploads_analyzed: acc.uploads_analyzed + (m.uploads_analyzed || 0),
          ai_generations: acc.ai_generations + (m.ai_generations || 0),
          parent_insights: acc.parent_insights + (m.parent_insights_generated || 0),
          adaptive_support_plans: acc.adaptive_support_plans + (m.adaptive_support_plans_generated || 0),
        }),
        { uploads_analyzed: 0, ai_generations: 0, parent_insights: 0, adaptive_support_plans: 0 }
      ) || { uploads_analyzed: 0, ai_generations: 0, parent_insights: 0, adaptive_support_plans: 0 };

      return {
        totalSchools: schools?.length || 0,
        activeSchools: schools?.filter((s) => s.billing_status === "active").length || 0,
        suspendedSchools: schools?.filter((s) => s.billing_status === "suspended").length || 0,
        schoolsByPlan,
        totalTeachers: classesCount || 0,
        totalStudents: studentsCount || 0,
        aiUsageThisMonth: aiUsage,
      };
    },
  });
}

// Helper to log audit events
async function logAuditEvent(
  action: PlatformAuditAction,
  actorId: string,
  targetSchoolId?: string,
  targetSubscriptionId?: string,
  previousState?: Record<string, unknown>,
  newState?: Record<string, unknown>,
  reason?: string
) {
  const { error } = await supabase.from("platform_audit_logs").insert({
    action: action as string,
    actor_id: actorId,
    target_school_id: targetSchoolId || null,
    target_subscription_id: targetSubscriptionId || null,
    previous_state: previousState || null,
    new_state: newState || null,
    reason: reason || null,
    user_agent: navigator.userAgent,
  });

  if (error) {
    console.error("Failed to log audit event:", error);
  }
}

// Activate plan for a school
export function useActivatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ActivatePlanPayload) => {
      const { data: adminData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!adminData) throw new Error("Not a super admin");

      // Check if subscription exists
      const { data: existing } = await supabase
        .from("school_subscriptions")
        .select("id, plan_id")
        .eq("school_id", payload.schoolId)
        .maybeSingle();

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from("school_subscriptions")
          .update({
            plan_id: payload.planId,
            status: "active",
            activated_by: adminData.id,
            activated_at: new Date().toISOString(),
            expires_at: payload.expiresAt || null,
            notes: payload.notes || null,
            suspended_at: null,
            suspended_by: null,
            suspension_reason: null,
          })
          .eq("id", existing.id);

        if (error) throw error;

        // Log billing event
        await supabase.from("billing_events").insert({
          school_id: payload.schoolId,
          event_type: existing.plan_id !== payload.planId ? "plan_change" : "manual_activation",
          plan_id: payload.planId,
          previous_plan_id: existing.plan_id,
          notes: payload.notes || null,
          created_by: adminData.id,
        });

        await logAuditEvent(
          "plan_activated",
          adminData.id,
          payload.schoolId,
          existing.id,
          { plan_id: existing.plan_id },
          { plan_id: payload.planId, expires_at: payload.expiresAt }
        );
      } else {
        // Create new subscription
        const { data: newSub, error } = await supabase
          .from("school_subscriptions")
          .insert({
            school_id: payload.schoolId,
            plan_id: payload.planId,
            status: "active",
            activated_by: adminData.id,
            activated_at: new Date().toISOString(),
            expires_at: payload.expiresAt || null,
            notes: payload.notes || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Log billing event
        await supabase.from("billing_events").insert({
          school_id: payload.schoolId,
          event_type: "manual_activation",
          plan_id: payload.planId,
          notes: payload.notes || null,
          created_by: adminData.id,
        });

        await logAuditEvent(
          "plan_activated",
          adminData.id,
          payload.schoolId,
          newSub.id,
          null,
          { plan_id: payload.planId, expires_at: payload.expiresAt }
        );
      }

      // Update school billing status
      await supabase
        .from("schools")
        .update({ billing_status: "active" })
        .eq("id", payload.schoolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-schools"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["platform-audit-logs"] });
      toast.success("Plan activated successfully");
    },
    onError: (error) => {
      toast.error("Failed to activate plan: " + error.message);
    },
  });
}

// Suspend a school
export function useSuspendSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SuspendSchoolPayload) => {
      const { data: adminData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!adminData) throw new Error("Not a super admin");

      const { data: sub, error: subError } = await supabase
        .from("school_subscriptions")
        .update({
          status: "suspended",
          suspended_at: new Date().toISOString(),
          suspended_by: adminData.id,
          suspension_reason: payload.reason,
        })
        .eq("school_id", payload.schoolId)
        .select()
        .single();

      if (subError) throw subError;

      // Update school billing status
      await supabase
        .from("schools")
        .update({ billing_status: "suspended" })
        .eq("id", payload.schoolId);

      // Log billing event
      await supabase.from("billing_events").insert({
        school_id: payload.schoolId,
        event_type: "suspension",
        notes: payload.reason,
        created_by: adminData.id,
      });

      await logAuditEvent(
        "school_suspended",
        adminData.id,
        payload.schoolId,
        sub.id,
        { status: "active" },
        { status: "suspended", reason: payload.reason },
        payload.reason
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-schools"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["platform-audit-logs"] });
      toast.success("School suspended");
    },
    onError: (error) => {
      toast.error("Failed to suspend school: " + error.message);
    },
  });
}

// Reinstate a school
export function useReinstateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      const { data: adminData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!adminData) throw new Error("Not a super admin");

      const { data: sub, error: subError } = await supabase
        .from("school_subscriptions")
        .update({
          status: "active",
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
        })
        .eq("school_id", schoolId)
        .select()
        .single();

      if (subError) throw subError;

      // Update school billing status
      await supabase
        .from("schools")
        .update({ billing_status: "active" })
        .eq("id", schoolId);

      // Log billing event
      await supabase.from("billing_events").insert({
        school_id: schoolId,
        event_type: "reinstatement",
        created_by: adminData.id,
      });

      await logAuditEvent(
        "school_reinstated",
        adminData.id,
        schoolId,
        sub.id,
        { status: "suspended" },
        { status: "active" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-schools"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["platform-audit-logs"] });
      toast.success("School reinstated");
    },
    onError: (error) => {
      toast.error("Failed to reinstate school: " + error.message);
    },
  });
}

// Extend subscription
export function useExtendSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ExtendSubscriptionPayload) => {
      const { data: adminData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!adminData) throw new Error("Not a super admin");

      const { data: sub, error } = await supabase
        .from("school_subscriptions")
        .update({
          expires_at: payload.newExpiresAt,
          notes: payload.notes || null,
        })
        .eq("school_id", payload.schoolId)
        .select()
        .single();

      if (error) throw error;

      // Log billing event
      await supabase.from("billing_events").insert({
        school_id: payload.schoolId,
        event_type: "extension",
        notes: payload.notes || null,
        created_by: adminData.id,
      });

      await logAuditEvent(
        "subscription_extended",
        adminData.id,
        payload.schoolId,
        sub.id,
        { expires_at: sub.expires_at },
        { expires_at: payload.newExpiresAt },
        payload.notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-schools"] });
      queryClient.invalidateQueries({ queryKey: ["platform-audit-logs"] });
      toast.success("Subscription extended");
    },
    onError: (error) => {
      toast.error("Failed to extend subscription: " + error.message);
    },
  });
}

// Toggle AI kill switch
export function useToggleAiKillSwitch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activate, reason }: { activate: boolean; reason?: string }) => {
      const { data: adminData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!adminData) throw new Error("Not a super admin");

      const { error } = await supabase
        .from("platform_ai_controls")
        .update({
          kill_switch_active: activate,
          kill_switch_activated_at: activate ? new Date().toISOString() : null,
          kill_switch_activated_by: activate ? adminData.id : null,
          kill_switch_reason: activate ? reason || null : null,
          updated_by: adminData.id,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all rows

      if (error) throw error;

      await logAuditEvent(
        activate ? "ai_kill_switch_activated" : "ai_kill_switch_deactivated",
        adminData.id,
        undefined,
        undefined,
        { kill_switch_active: !activate },
        { kill_switch_active: activate, reason },
        reason
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform-ai-controls"] });
      queryClient.invalidateQueries({ queryKey: ["platform-audit-logs"] });
      toast.success(variables.activate ? "AI Kill Switch ACTIVATED" : "AI Kill Switch deactivated");
    },
    onError: (error) => {
      toast.error("Failed to toggle kill switch: " + error.message);
    },
  });
}

// Update AI feature toggles
export function useUpdateAiFeatureToggles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featureToggles: Record<string, boolean>) => {
      const { data: adminData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!adminData) throw new Error("Not a super admin");

      const { data: current } = await supabase
        .from("platform_ai_controls")
        .select("feature_toggles")
        .limit(1)
        .single();

      const { error } = await supabase
        .from("platform_ai_controls")
        .update({
          feature_toggles: featureToggles,
          updated_by: adminData.id,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      await logAuditEvent(
        "ai_toggle_changed",
        adminData.id,
        undefined,
        undefined,
        current?.feature_toggles as Record<string, unknown>,
        featureToggles
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-ai-controls"] });
      queryClient.invalidateQueries({ queryKey: ["platform-audit-logs"] });
      toast.success("AI features updated");
    },
    onError: (error) => {
      toast.error("Failed to update AI features: " + error.message);
    },
  });
}

// Archive a school (no deletion)
export function useArchiveSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, reason }: { schoolId: string; reason?: string }) => {
      const { data: adminData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!adminData) throw new Error("Not a super admin");

      const { error } = await supabase
        .from("schools")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by: adminData.id,
        })
        .eq("id", schoolId);

      if (error) throw error;

      await logAuditEvent(
        "school_archived",
        adminData.id,
        schoolId,
        undefined,
        { is_archived: false },
        { is_archived: true },
        reason
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-schools"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["platform-audit-logs"] });
      toast.success("School archived");
    },
    onError: (error) => {
      toast.error("Failed to archive school: " + error.message);
    },
  });
}
