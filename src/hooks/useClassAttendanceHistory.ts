import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AttendanceSummary {
  date: string;
  total: number;
  present: number;
  absent: number;
}

/**
 * Hook to fetch attendance history for a class, grouped by date
 */
export function useClassAttendanceHistory(classId: string | undefined) {
  return useQuery({
    queryKey: ["attendance", "class-history", classId],
    queryFn: async (): Promise<AttendanceSummary[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from("attendance_records")
        .select("date, present")
        .eq("class_id", classId)
        .order("date", { ascending: false });

      if (error) throw error;

      // Group by date and calculate counts
      const grouped = (data || []).reduce<Record<string, { present: number; absent: number }>>((acc, record) => {
        if (!acc[record.date]) {
          acc[record.date] = { present: 0, absent: 0 };
        }
        if (record.present) {
          acc[record.date].present++;
        } else {
          acc[record.date].absent++;
        }
        return acc;
      }, {});

      return Object.entries(grouped).map(([date, counts]) => ({
        date,
        total: counts.present + counts.absent,
        present: counts.present,
        absent: counts.absent,
      }));
    },
    enabled: !!classId,
  });
}
