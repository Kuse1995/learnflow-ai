import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolGuardian {
  id: string;
  display_name: string;
  primary_phone: string | null;
  email: string | null;
  has_account: boolean;
  created_at: string;
  linked_students: Array<{
    student_id: string;
    student_name: string;
    relationship_label: string | null;
  }>;
}

export function useSchoolGuardians(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-guardians", schoolId],
    queryFn: async (): Promise<SchoolGuardian[]> => {
      if (!schoolId) return [];

      // Fetch guardians for the school
      const { data: guardians, error: guardiansError } = await supabase
        .from("guardians")
        .select("id, display_name, primary_phone, email, has_account, created_at")
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .order("display_name");

      if (guardiansError) throw guardiansError;
      if (!guardians || guardians.length === 0) return [];

      // Fetch all guardian-student links for these guardians
      const guardianIds = guardians.map((g) => g.id);
      const { data: links, error: linksError } = await supabase
        .from("guardian_student_links")
        .select(`
          guardian_id,
          relationship_label,
          students:student_id (
            id,
            name
          )
        `)
        .in("guardian_id", guardianIds);

      if (linksError) throw linksError;

      // Build a map of guardian_id -> linked students
      const linksMap = new Map<string, Array<{ student_id: string; student_name: string; relationship_label: string | null }>>();
      
      if (links) {
        for (const link of links) {
          const studentData = link.students as unknown as { id: string; name: string } | null;
          if (!studentData) continue;
          
          const existing = linksMap.get(link.guardian_id) || [];
          existing.push({
            student_id: studentData.id,
            student_name: studentData.name,
            relationship_label: link.relationship_label,
          });
          linksMap.set(link.guardian_id, existing);
        }
      }

      // Combine data
      return guardians.map((guardian) => ({
        ...guardian,
        has_account: guardian.has_account ?? false,
        linked_students: linksMap.get(guardian.id) || [],
      }));
    },
    enabled: !!schoolId,
  });
}
