import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Student } from "@/types/attendance";

/**
 * Hook to fetch a single student by ID
 */
export function useStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student", studentId],
    queryFn: async (): Promise<Student | null> => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

/**
 * Hook to fetch students for a specific class
 */
export function useStudentsByClass(classId: string | undefined) {
  return useQuery({
    queryKey: ["students", "class", classId],
    queryFn: async (): Promise<Student[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", classId)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!classId,
  });
}

/**
 * Hook to fetch all students
 */
export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async (): Promise<Student[]> => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });
}
