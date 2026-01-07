import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export type RecentPracticeLevel = "none" | "few" | "several";
export type SupportPlanStatus = "acknowledged" | "pending" | "none";
export type GentleNudge = "encouragement" | "ongoing" | "no_activity";

export interface StudentPracticeAwareness {
  studentId: string;
  studentName: string;
  lastPracticeDate: string | null;
  recentPracticeLevel: RecentPracticeLevel;
  supportPlanStatus: SupportPlanStatus;
  gentleNudge: GentleNudge;
}

/**
 * Get practice awareness data for a class (teacher view only)
 */
export function useClassPracticeAwareness(classId: string | undefined) {
  return useQuery({
    queryKey: ["practice-awareness", classId],
    queryFn: async (): Promise<StudentPracticeAwareness[]> => {
      if (!classId) return [];

      // Fetch students in class
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name")
        .eq("class_id", classId)
        .order("name");

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) return [];

      const studentIds = students.map((s) => s.id);
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString();

      // Fetch practice sessions from last 14 days
      const { data: sessions, error: sessionsError } = await supabase
        .from("practice_sessions")
        .select("student_id, created_at, completed_at")
        .eq("class_id", classId)
        .in("student_id", studentIds)
        .gte("created_at", fourteenDaysAgo)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch adaptive support plans status
      const { data: plans, error: plansError } = await supabase
        .from("student_intervention_plans")
        .select("student_id, teacher_acknowledged")
        .eq("class_id", classId)
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;

      // Build awareness data for each student
      const awarenessData: StudentPracticeAwareness[] = students.map((student) => {
        // Count sessions for this student
        const studentSessions = sessions?.filter((s) => s.student_id === student.id) || [];
        const sessionCount = studentSessions.length;

        // Determine practice level bucket
        let recentPracticeLevel: RecentPracticeLevel;
        if (sessionCount === 0) {
          recentPracticeLevel = "none";
        } else if (sessionCount <= 2) {
          recentPracticeLevel = "few";
        } else {
          recentPracticeLevel = "several";
        }

        // Get last practice date
        const lastSession = studentSessions[0];
        const lastPracticeDate = lastSession?.created_at || null;

        // Get support plan status (most recent plan)
        const studentPlan = plans?.find((p) => p.student_id === student.id);
        let supportPlanStatus: SupportPlanStatus;
        if (!studentPlan) {
          supportPlanStatus = "none";
        } else if (studentPlan.teacher_acknowledged) {
          supportPlanStatus = "acknowledged";
        } else {
          supportPlanStatus = "pending";
        }

        // Determine gentle nudge
        let gentleNudge: GentleNudge;
        if (sessionCount === 0) {
          gentleNudge = "no_activity";
        } else if (sessionCount >= 2) {
          gentleNudge = "ongoing";
        } else {
          gentleNudge = "encouragement";
        }

        return {
          studentId: student.id,
          studentName: student.name,
          lastPracticeDate,
          recentPracticeLevel,
          supportPlanStatus,
          gentleNudge,
        };
      });

      return awarenessData;
    },
    enabled: !!classId,
  });
}

/**
 * Format the recent practice level for display
 */
export function formatPracticeLevel(level: RecentPracticeLevel): string {
  switch (level) {
    case "none":
      return "None yet";
    case "few":
      return "A few";
    case "several":
      return "Several";
  }
}

/**
 * Format the support plan status for display
 */
export function formatPlanStatus(status: SupportPlanStatus): string {
  switch (status) {
    case "acknowledged":
      return "Plan acknowledged";
    case "pending":
      return "Plan awaiting review";
    case "none":
      return "No plan generated";
  }
}

/**
 * Format the gentle nudge for display
 */
export function formatGentleNudge(nudge: GentleNudge): string {
  switch (nudge) {
    case "encouragement":
      return "May benefit from encouragement";
    case "ongoing":
      return "Practice ongoing";
    case "no_activity":
      return "No recent activity yet";
  }
}
