import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Class } from "@/types/attendance";

/**
 * Hook to fetch all classes
 */
export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async (): Promise<Class[]> => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Hook to fetch a single class by ID
 */
export function useClass(classId: string | undefined) {
  return useQuery({
    queryKey: ["classes", classId],
    queryFn: async (): Promise<Class | null> => {
      if (!classId) return null;

      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}
