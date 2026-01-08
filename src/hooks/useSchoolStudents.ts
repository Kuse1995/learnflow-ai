import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolStudent {
  id: string;
  student_id: string;
  name: string;
  grade: string | null;
  class_id: string | null;
  class_name: string | null;
  school_id: string | null;
  created_at: string;
  guardian_name: string | null;
  guardian_phone: string | null;
}

export function useSchoolStudents(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-students", schoolId],
    queryFn: async (): Promise<SchoolStudent[]> => {
      if (!schoolId) return [];

      // Get students with their class info
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          name,
          grade,
          class_id,
          school_id,
          created_at,
          classes(name)
        `)
        .eq("school_id", schoolId)
        .is("deleted_at", null)
        .order("name");

      if (studentsError) throw studentsError;

      // Get guardian links for these students
      const studentIds = students?.map(s => s.id) || [];
      
      let guardianMap: Record<string, { name: string; phone: string | null }> = {};
      
      if (studentIds.length > 0) {
        const { data: links, error: linksError } = await supabase
          .from("guardian_student_links")
          .select(`
            student_id,
            guardians(display_name, primary_phone)
          `)
          .in("student_id", studentIds)
          .eq("role", "primary_guardian")
          .is("deleted_at", null);

        if (!linksError && links) {
          for (const link of links) {
            const guardian = link.guardians as unknown as { display_name: string; primary_phone: string | null };
            if (guardian) {
              guardianMap[link.student_id] = {
                name: guardian.display_name,
                phone: guardian.primary_phone,
              };
            }
          }
        }
      }

      return (students || []).map(s => ({
        id: s.id,
        student_id: s.student_id,
        name: s.name,
        grade: s.grade,
        class_id: s.class_id,
        class_name: (s.classes as unknown as { name: string } | null)?.name || null,
        school_id: s.school_id,
        created_at: s.created_at,
        guardian_name: guardianMap[s.id]?.name || null,
        guardian_phone: guardianMap[s.id]?.phone || null,
      }));
    },
    enabled: !!schoolId,
  });
}
