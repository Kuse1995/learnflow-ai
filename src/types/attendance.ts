/**
 * Core attendance data types
 * Maps to database schema for attendance tracking
 */

export interface Class {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  teacher_id: string | null;
  school_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_id: string;
  name: string;
  avatar_url: string | null;
  class_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  present: boolean;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

// For UI components
export interface AttendanceEntry {
  studentId: string;
  present: boolean;
}

// For saving attendance
export interface SaveAttendanceParams {
  classId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  attendance: AttendanceEntry[];
}

// Student with attendance status for display
export interface StudentWithAttendance extends Student {
  isPresent: boolean;
}
