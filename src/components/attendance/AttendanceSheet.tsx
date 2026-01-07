import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AttendanceStudentCard } from "./AttendanceStudentCard";
import { Calendar, Users, Check } from "lucide-react";
import type { Student as StudentType } from "@/types/attendance";

// Re-export for backwards compatibility
export type { Student } from "./AttendanceStudentCard";

interface AttendanceEntry {
  studentId: string;
  present: boolean;
}

interface AttendanceSheetProps {
  classId: string;
  className: string;
  date: Date;
  students: StudentType[];
  initialAttendance?: AttendanceEntry[];
  onSave?: (attendance: AttendanceEntry[]) => void | Promise<void>;
  onDateChange?: (date: Date) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * Canonical AttendanceSheet component.
 * 
 * Interaction pattern (consistent across web/mobile):
 * 1. Select class (via parent or selector)
 * 2. View student list with toggles
 * 3. Tap toggle → mark present/absent
 * 4. Save → confirm changes
 * 
 * Features:
 * - Summary stats (present/absent counts)
 * - "Mark all present" quick action
 * - Sticky header with date selector
 */
export function AttendanceSheet({
  classId,
  className,
  date,
  students,
  initialAttendance = [],
  onSave,
  onDateChange,
  disabled = false,
}: AttendanceSheetProps) {
  // Initialize attendance state - default all students to present
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    students.forEach((student) => {
      const existing = initialAttendance.find((a) => a.studentId === student.id);
      initial[student.id] = existing?.present ?? true;
    });
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const presentCount = Object.values(attendance).filter(Boolean).length;
    return {
      present: presentCount,
      absent: students.length - presentCount,
      total: students.length,
    };
  }, [attendance, students.length]);

  const handleToggle = (studentId: string, present: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: present,
    }));
  };

  const handleMarkAllPresent = () => {
    const allPresent: Record<string, boolean> = {};
    students.forEach((student) => {
      allPresent[student.id] = true;
    });
    setAttendance(allPresent);
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    const records: AttendanceRecord[] = Object.entries(attendance).map(
      ([studentId, present]) => ({ studentId, present })
    );
    
    try {
      await onSave(records);
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold leading-tight tracking-tight">
            Attendance
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => onDateChange?.(date)}
          >
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{formattedDate}</span>
          </Button>
        </div>

        {/* Class Selector Display */}
        <div className="relative w-full bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{className}</span>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="px-4 py-4">
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col items-center justify-center bg-primary/10 rounded-xl p-3 border border-primary/20">
            <span className="text-3xl font-bold text-primary">
              {stats.present}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-1">
              Present
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center bg-absent-bg rounded-xl p-3 border border-absent/20">
            <span className="text-3xl font-bold text-absent">
              {stats.absent}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-1">
              Absent
            </span>
          </div>
        </div>
      </div>

      {/* Student List Header */}
      <div className="flex items-center justify-between px-4 pb-2">
        <p className="text-muted-foreground text-sm font-medium">
          Student List ({stats.total})
        </p>
        <button
          type="button"
          onClick={handleMarkAllPresent}
          disabled={disabled}
          className="text-primary text-sm font-semibold hover:underline disabled:opacity-50"
        >
          Mark all present
        </button>
      </div>

      {/* Scrollable Student List */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 space-y-3">
        {students.map((student) => (
          <AttendanceStudentCard
            key={student.id}
            student={student}
            isPresent={attendance[student.id] ?? true}
            onToggle={handleToggle}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Save Button - Fixed at bottom */}
      {onSave && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 pb-safe bg-gradient-to-t from-background via-background/95 to-transparent">
          <Button
            onClick={handleSave}
            disabled={disabled || isSaving}
            className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg"
          >
            <Check className="h-5 w-5 mr-2" />
            {isSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      )}
    </div>
  );
}
