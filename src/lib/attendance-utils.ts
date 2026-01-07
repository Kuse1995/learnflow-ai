import type { Student as DbStudent, AttendanceRecord } from "@/types/attendance";
import type { Student as UiStudent } from "@/components/attendance/AttendanceStudentCard";

/**
 * Convert database student to UI student format
 */
export function toUiStudent(dbStudent: DbStudent): UiStudent {
  return {
    id: dbStudent.id,
    name: dbStudent.name,
    studentId: dbStudent.student_id,
    avatarUrl: dbStudent.avatar_url ?? undefined,
  };
}

/**
 * Convert array of database students to UI students
 */
export function toUiStudents(dbStudents: DbStudent[]): UiStudent[] {
  return dbStudents.map(toUiStudent);
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Convert attendance records to initial attendance format
 */
export function toInitialAttendance(
  records: AttendanceRecord[]
): { studentId: string; present: boolean }[] {
  return records.map((record) => ({
    studentId: record.student_id,
    present: record.present,
  }));
}
