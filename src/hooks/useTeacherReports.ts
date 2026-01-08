import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ==================== CLASS REPORT TYPES ====================

export interface ClassReportOverview {
  studentCount: number;
  subjects: string[];
  recentAnalysesCount: number;
  lastAnalysisDate: string | null;
}

export interface LearningTheme {
  topic: string;
  activityCount: number;
  recentActivity: boolean;
}

export interface TeachingActionsSummary {
  totalCount: number;
  topicThemes: string[];
  recentCount: number; // Last 30 days
}

export interface AdaptiveSupportCoverage {
  studentsWithPlans: number;
  acknowledgedCount: number;
  pendingCount: number;
}

export interface ClassReport {
  overview: ClassReportOverview;
  learningThemes: LearningTheme[];
  teachingActions: TeachingActionsSummary;
  supportCoverage: AdaptiveSupportCoverage;
}

// ==================== STUDENT REPORT TYPES ====================

export interface LearningSnapshot {
  strengths: string[];
  topicsBeingPracticed: string[];
  focusAreas: string[];
}

export type EngagementTrend = 'increasing' | 'stable' | 'needs_encouragement';

export interface SupportHistoryItem {
  id: string;
  generatedAt: string;
  focusAreas: string[];
  acknowledged: boolean;
}

export interface ParentCommunicationStatus {
  hasDraft: boolean;
  isApproved: boolean;
  approvedAt: string | null;
  sharedAt: string | null;
}

export interface StudentReport {
  studentId: string;
  studentName: string;
  learningSnapshot: LearningSnapshot;
  engagementTrend: EngagementTrend;
  supportHistory: SupportHistoryItem[];
  parentCommunication: ParentCommunicationStatus;
}

// ==================== CLASS REPORT HOOK ====================

/**
 * Hook to fetch class report data
 * Read-only, aggregated insights
 */
export function useClassReport(classId: string | undefined) {
  return useQuery({
    queryKey: ["class-report", classId],
    queryFn: async (): Promise<ClassReport | null> => {
      if (!classId) return null;

      // Fetch students count
      const { count: studentCount } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId);

      // Fetch recent analyses for this class (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: analyses } = await supabase
        .from("upload_analyses")
        .select("id, created_at, class_summary")
        .eq("class_id", classId)
        .gte("created_at", ninetyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      // Extract subjects from class summaries
      const subjects: string[] = [];
      (analyses || []).forEach(a => {
        if (a.class_summary && typeof a.class_summary === 'object') {
          const summary = a.class_summary as Record<string, unknown>;
          if (summary.subject && typeof summary.subject === 'string') {
            if (!subjects.includes(summary.subject)) {
              subjects.push(summary.subject);
            }
          }
        }
      });

      // Fetch learning themes from teaching action logs (topics discussed)
      const { data: actionLogs } = await supabase
        .from("teacher_action_logs")
        .select("id, topic, created_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Aggregate topics from action logs
      const topicCounts = new Map<string, { count: number; recentActivity: boolean }>();
      (actionLogs || []).forEach(log => {
        if (log.topic) {
          const existing = topicCounts.get(log.topic) || { count: 0, recentActivity: false };
          existing.count++;
          if (new Date(log.created_at) >= thirtyDaysAgo) {
            existing.recentActivity = true;
          }
          topicCounts.set(log.topic, existing);
        }
      });

      const learningThemes: LearningTheme[] = Array.from(topicCounts.entries())
        .map(([topic, data]) => ({
          topic,
          activityCount: data.count,
          recentActivity: data.recentActivity
        }))
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 10);

      // Calculate teaching actions summary
      const recentActions = (actionLogs || []).filter(
        log => new Date(log.created_at) >= thirtyDaysAgo
      );

      const topicThemes = [...new Set(
        (actionLogs || [])
          .map(log => log.topic)
          .filter((t): t is string => !!t)
      )].slice(0, 5);

      // Fetch adaptive support plans
      const { data: supportPlans } = await supabase
        .from("student_intervention_plans")
        .select("id, student_id, teacher_acknowledged")
        .eq("class_id", classId);

      const acknowledgedPlans = (supportPlans || []).filter(p => p.teacher_acknowledged);
      const pendingPlans = (supportPlans || []).filter(p => !p.teacher_acknowledged);

      // Get unique students with plans
      const uniqueStudentsWithPlans = new Set(
        (supportPlans || []).map(p => p.student_id)
      ).size;

      return {
        overview: {
          studentCount: studentCount || 0,
          subjects,
          recentAnalysesCount: (analyses || []).length,
          lastAnalysisDate: analyses?.[0]?.created_at || null
        },
        learningThemes,
        teachingActions: {
          totalCount: (actionLogs || []).length,
          topicThemes,
          recentCount: recentActions.length
        },
        supportCoverage: {
          studentsWithPlans: uniqueStudentsWithPlans,
          acknowledgedCount: acknowledgedPlans.length,
          pendingCount: pendingPlans.length
        }
      };
    },
    enabled: !!classId,
    staleTime: 60000 // 1 minute
  });
}

// ==================== STUDENT REPORT HOOK ====================

/**
 * Hook to fetch student report data
 * Read-only, narrative-focused
 */
export function useStudentReport(studentId: string | undefined, classId?: string) {
  return useQuery({
    queryKey: ["student-report", studentId, classId],
    queryFn: async (): Promise<StudentReport | null> => {
      if (!studentId) return null;

      // Fetch student info
      const { data: student } = await supabase
        .from("students")
        .select("id, name, class_id")
        .eq("id", studentId)
        .single();

      if (!student) return null;

      // Fetch learning profile
      const { data: learningProfile } = await supabase
        .from("student_learning_profiles")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      // Build learning snapshot from profile
      // Note: 'strengths' is a single string, 'weak_topics' is string array
      const strengthsArray: string[] = [];
      if (learningProfile?.strengths) {
        // Split by comma or newline if multiple
        strengthsArray.push(...learningProfile.strengths.split(/[,\n]/).map(s => s.trim()).filter(Boolean));
      }

      // Parse error_patterns (it's JSON)
      const errorPatterns: string[] = [];
      if (learningProfile?.error_patterns) {
        const patterns = learningProfile.error_patterns;
        if (Array.isArray(patterns)) {
          errorPatterns.push(...patterns.slice(0, 3).map(p => String(p)));
        } else if (typeof patterns === 'object') {
          // If it's an object, extract keys or values
          Object.keys(patterns as Record<string, unknown>).slice(0, 3).forEach(k => {
            errorPatterns.push(k);
          });
        }
      }

      const learningSnapshot: LearningSnapshot = {
        strengths: strengthsArray.slice(0, 5),
        topicsBeingPracticed: learningProfile?.weak_topics || [],
        focusAreas: errorPatterns
      };

      // Determine engagement trend based on practice sessions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { count: recentPractice } = await supabase
        .from("practice_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      const { count: previousPractice } = await supabase
        .from("practice_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());

      let engagementTrend: EngagementTrend = 'stable';
      const recent = recentPractice || 0;
      const previous = previousPractice || 0;

      if (recent > previous * 1.2) {
        engagementTrend = 'increasing';
      } else if (recent < previous * 0.5 || (recent === 0 && previous > 0)) {
        engagementTrend = 'needs_encouragement';
      }

      // Fetch support history
      const { data: supportPlans } = await supabase
        .from("student_intervention_plans")
        .select("id, generated_at, focus_areas, teacher_acknowledged")
        .eq("student_id", studentId)
        .order("generated_at", { ascending: false })
        .limit(5);

      const supportHistory: SupportHistoryItem[] = (supportPlans || []).map(plan => ({
        id: plan.id,
        generatedAt: plan.generated_at,
        focusAreas: plan.focus_areas || [],
        acknowledged: plan.teacher_acknowledged
      }));

      // Fetch parent communication status
      const { data: parentInsight } = await supabase
        .from("parent_insight_summaries")
        .select("id, teacher_approved, approved_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check for delivered messages
      const { data: deliveredMessage } = await supabase
        .from("parent_messages")
        .select("delivered_at")
        .eq("student_id", studentId)
        .eq("delivery_status", "delivered")
        .order("delivered_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const parentCommunication: ParentCommunicationStatus = {
        hasDraft: !!parentInsight && !parentInsight.teacher_approved,
        isApproved: !!parentInsight?.teacher_approved,
        approvedAt: parentInsight?.approved_at || null,
        sharedAt: deliveredMessage?.delivered_at || null
      };

      return {
        studentId: student.id,
        studentName: student.name,
        learningSnapshot,
        engagementTrend,
        supportHistory,
        parentCommunication
      };
    },
    enabled: !!studentId,
    staleTime: 60000 // 1 minute
  });
}

// ==================== DISPLAY HELPERS ====================

export function getEngagementTrendDisplay(trend: EngagementTrend): {
  label: string;
  description: string;
  color: string;
  icon: string;
} {
  const config = {
    increasing: {
      label: 'Increasing',
      description: 'Practice activity has grown recently',
      color: 'text-green-600',
      icon: 'TrendingUp'
    },
    stable: {
      label: 'Stable',
      description: 'Consistent practice patterns observed',
      color: 'text-muted-foreground',
      icon: 'Minus'
    },
    needs_encouragement: {
      label: 'Needs Encouragement',
      description: 'Practice activity has been quieter lately',
      color: 'text-amber-600',
      icon: 'Heart'
    }
  };
  return config[trend];
}
