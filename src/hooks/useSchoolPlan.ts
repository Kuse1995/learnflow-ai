import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SaaSPlan } from "@/lib/plan-features";

export interface School {
  id: string;
  name: string;
  plan: SaaSPlan;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch the current school and its plan
 * In a real implementation, this would be based on the authenticated user's school
 */
export function useSchoolPlan(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-plan", schoolId],
    queryFn: async (): Promise<School | null> => {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .maybeSingle();

      if (error) throw error;
      
      return data as School | null;
    },
    enabled: !!schoolId,
  });
}

/**
 * Hook to fetch school by class ID
 * Useful when you have a class context but need the school's plan
 */
export function useSchoolPlanByClass(classId: string | undefined) {
  return useQuery({
    queryKey: ["school-plan-by-class", classId],
    queryFn: async (): Promise<School | null> => {
      if (!classId) return null;

      // First get the class to find its school
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("school_id")
        .eq("id", classId)
        .maybeSingle();

      if (classError) throw classError;
      if (!classData?.school_id) {
        // No school linked - default to basic plan behavior
        return null;
      }

      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("*")
        .eq("id", classData.school_id)
        .maybeSingle();

      if (schoolError) throw schoolError;
      
      return schoolData as School | null;
    },
    enabled: !!classId,
  });
}
