import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Upload } from "./useUploads";

/**
 * Hook to fetch uploads for a specific class
 */
export function useUploadsByClass(classId: string | undefined) {
  return useQuery({
    queryKey: ["uploads", "class", classId],
    queryFn: async (): Promise<Upload[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("uploads")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Upload[];
    },
    enabled: !!classId,
  });
}
