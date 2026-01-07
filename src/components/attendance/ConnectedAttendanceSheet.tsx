import { useMemo } from "react";
import { AttendanceSheet, type Student } from "./AttendanceSheet";
import { useStudentsByClass } from "@/hooks/useStudents";
import { useAttendanceByClassAndDate, useSaveAttendance } from "@/hooks/useAttendance";
import { useClass } from "@/hooks/useClasses";
import { toUiStudents, toIsoDate, toInitialAttendance } from "@/lib/attendance-utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectedAttendanceSheetProps {
  classId: string;
  date: Date;
  onDateChange?: (date: Date) => void;
  onSaveSuccess?: () => void;
}

/**
 * Connected AttendanceSheet that fetches data from the backend.
 * Uses the canonical AttendanceSheet component with real data.
 */
export function ConnectedAttendanceSheet({
  classId,
  date,
  onDateChange,
  onSaveSuccess,
}: ConnectedAttendanceSheetProps) {
  const { toast } = useToast();
  const isoDate = toIsoDate(date);

  // Fetch class info
  const { data: classInfo, isLoading: classLoading } = useClass(classId);

  // Fetch students for this class
  const { data: dbStudents = [], isLoading: studentsLoading } = useStudentsByClass(classId);

  // Fetch existing attendance for this date
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceByClassAndDate(
    classId,
    isoDate
  );

  // Save mutation
  const saveAttendance = useSaveAttendance();

  // Convert DB students to UI format
  const students: Student[] = useMemo(() => toUiStudents(dbStudents), [dbStudents]);

  // Convert attendance records to initial attendance format
  const initialAttendance = useMemo(
    () => toInitialAttendance(attendanceRecords),
    [attendanceRecords]
  );

  const isLoading = classLoading || studentsLoading || attendanceLoading;

  const handleSave = async (attendance: { studentId: string; present: boolean }[]) => {
    try {
      await saveAttendance.mutateAsync({
        classId,
        date: isoDate,
        attendance,
      });
      toast({
        title: "Attendance saved",
        description: `Saved attendance for ${attendance.length} students.`,
      });
      onSaveSuccess?.();
    } catch (error) {
      toast({
        title: "Error saving attendance",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-24 rounded-xl" />
          <Skeleton className="flex-1 h-24 rounded-xl" />
        </div>
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <AttendanceSheet
      classId={classId}
      className={classInfo?.name ?? "Unknown Class"}
      date={date}
      students={students}
      initialAttendance={initialAttendance}
      onSave={handleSave}
      onDateChange={onDateChange}
      disabled={saveAttendance.isPending}
    />
  );
}
