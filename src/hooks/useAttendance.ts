import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AttendanceRecord, AttendanceEntry, SaveAttendanceParams } from "@/types/attendance";

/**
 * Hook to fetch attendance records for a specific class and date
 */
export function useAttendanceByClassAndDate(
  classId: string | undefined,
  date: string | undefined // ISO date string (YYYY-MM-DD)
) {
  return useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!classId || !date) return [];

      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("class_id", classId)
        .eq("date", date);

      if (error) throw error;
      return data || [];
    },
    enabled: !!classId && !!date,
  });
}

/**
 * Hook to save attendance records (upsert pattern)
 * - Creates new records if they don't exist
 * - Updates existing records for the same class/date/student
 */
export function useSaveAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, date, attendance }: SaveAttendanceParams) => {
      // Build upsert records
      const records = attendance.map((entry) => ({
        class_id: classId,
        student_id: entry.studentId,
        date: date,
        present: entry.present,
        // marked_by would be set to current user when auth is implemented
      }));

      // Upsert - on conflict (student_id, class_id, date), update present status
      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(records, {
          onConflict: "student_id,class_id,date",
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate attendance query for this class/date
      queryClient.invalidateQueries({
        queryKey: ["attendance", variables.classId, variables.date],
      });
    },
  });
}

/**
 * Hook to fetch attendance history for a student
 */
export function useStudentAttendanceHistory(
  studentId: string | undefined,
  options?: { startDate?: string; endDate?: string }
) {
  return useQuery({
    queryKey: ["attendance", "student", studentId, options?.startDate, options?.endDate],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!studentId) return [];

      let query = supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false });

      if (options?.startDate) {
        query = query.gte("date", options.startDate);
      }
      if (options?.endDate) {
        query = query.lte("date", options.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
}
