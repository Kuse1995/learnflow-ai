import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DataReadinessState = "early" | "growing" | "well-informed";

export interface DataReadinessResult {
  state: DataReadinessState;
  label: string;
  description: string;
}

interface ClassReadinessInput {
  classId: string;
}

interface StudentReadinessInput {
  studentId: string;
}

/**
 * Assess data readiness for a class (used for Teaching Suggestions)
 */
export function useClassDataReadiness(classId: string | undefined) {
  return useQuery({
    queryKey: ["data-readiness", "class", classId],
    queryFn: async (): Promise<DataReadinessResult> => {
      if (!classId) {
        return getReadinessResult("early");
      }

      // Count completed analyses for this class
      const { data: analyses, error: analysesError } = await supabase
        .from("upload_analyses")
        .select("analyzed_at")
        .eq("class_id", classId)
        .eq("status", "completed");

      if (analysesError) throw analysesError;

      // Get student count and profiles count
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classId);

      const studentIds = students?.map((s) => s.id) || [];
      let profilesCount = 0;

      if (studentIds.length > 0) {
        const { count } = await supabase
          .from("student_learning_profiles")
          .select("id", { count: "exact", head: true })
          .in("student_id", studentIds);
        profilesCount = count || 0;
      }

      const analysesCount = analyses?.length || 0;
      const studentCount = studentIds.length || 1;
      const profileCoverage = profilesCount / studentCount;

      // Check recency of latest analysis
      let hasRecentAnalysis = false;
      if (analyses && analyses.length > 0) {
        const latestAnalysis = analyses.sort((a, b) => 
          new Date(b.analyzed_at || 0).getTime() - new Date(a.analyzed_at || 0).getTime()
        )[0];
        
        if (latestAnalysis.analyzed_at) {
          const daysSinceAnalysis = (Date.now() - new Date(latestAnalysis.analyzed_at).getTime()) / (1000 * 60 * 60 * 24);
          hasRecentAnalysis = daysSinceAnalysis <= 30;
        }
      }

      // Determine readiness state
      const state = assessReadiness(analysesCount, profileCoverage, hasRecentAnalysis);
      return getReadinessResult(state);
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Assess data readiness for a student (used for Learning Profile)
 */
export function useStudentDataReadiness(studentId: string | undefined) {
  return useQuery({
    queryKey: ["data-readiness", "student", studentId],
    queryFn: async (): Promise<DataReadinessResult> => {
      if (!studentId) {
        return getReadinessResult("early");
      }

      // Check if student has a learning profile
      const { data: profile } = await supabase
        .from("student_learning_profiles")
        .select("last_updated, weak_topics, error_patterns")
        .eq("student_id", studentId)
        .maybeSingle();

      if (!profile) {
        return getReadinessResult("early");
      }

      // Check how much data is in the profile
      const weakTopics = (profile.weak_topics as string[]) || [];
      const errorPatterns = profile.error_patterns as Record<string, number> | null;
      const hasErrorPatternData = errorPatterns && Object.values(errorPatterns).some((v) => v > 0);

      // Check recency
      let isRecent = false;
      if (profile.last_updated) {
        const daysSinceUpdate = (Date.now() - new Date(profile.last_updated).getTime()) / (1000 * 60 * 60 * 24);
        isRecent = daysSinceUpdate <= 30;
      }

      // Get number of analyses that include this student
      const { data: studentData } = await supabase
        .from("students")
        .select("class_id")
        .eq("id", studentId)
        .single();

      let analysesCount = 0;
      if (studentData?.class_id) {
        const { count } = await supabase
          .from("upload_analyses")
          .select("id", { count: "exact", head: true })
          .eq("class_id", studentData.class_id)
          .eq("status", "completed");
        analysesCount = count || 0;
      }

      // Determine readiness
      if (analysesCount >= 3 && weakTopics.length > 0 && hasErrorPatternData && isRecent) {
        return getReadinessResult("well-informed");
      } else if (analysesCount >= 1 && (weakTopics.length > 0 || hasErrorPatternData)) {
        return getReadinessResult("growing");
      } else {
        return getReadinessResult("early");
      }
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

function assessReadiness(
  analysesCount: number,
  profileCoverage: number,
  hasRecentAnalysis: boolean
): DataReadinessState {
  // Well-informed: 3+ analyses, 50%+ profile coverage, recent data
  if (analysesCount >= 3 && profileCoverage >= 0.5 && hasRecentAnalysis) {
    return "well-informed";
  }
  // Growing: 1-2 analyses, some coverage, or good data but not recent
  if (analysesCount >= 1 && (profileCoverage >= 0.25 || hasRecentAnalysis)) {
    return "growing";
  }
  // Early: minimal data
  return "early";
}

function getReadinessResult(state: DataReadinessState): DataReadinessResult {
  const configs: Record<DataReadinessState, { label: string; description: string }> = {
    early: {
      label: "Early Insights",
      description: "Based on initial observations. Insights may evolve as more work is analyzed.",
    },
    growing: {
      label: "Growing Understanding",
      description: "Patterns are beginning to emerge. Continue analyzing work for richer insights.",
    },
    "well-informed": {
      label: "Well-Informed",
      description: "Based on consistent evidence across multiple analyses.",
    },
  };

  return {
    state,
    ...configs[state],
  };
}
