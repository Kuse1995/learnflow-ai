import { cn } from "@/lib/utils";
import { AttendanceToggle } from "./AttendanceToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Student {
  id: string;
  name: string;
  studentId: string;
  avatarUrl?: string;
}

interface AttendanceStudentCardProps {
  student: Student;
  isPresent: boolean;
  onToggle: (studentId: string, present: boolean) => void;
  disabled?: boolean;
}

/**
 * Canonical student attendance card.
 * Pattern: Avatar + Name + ID + Toggle
 * Consistent across all attendance screens.
 */
export function AttendanceStudentCard({
  student,
  isPresent,
  onToggle,
  disabled = false,
}: AttendanceStudentCardProps) {
  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm transition-all",
        isPresent 
          ? "border-border" 
          : "border-absent/30 ring-1 ring-absent/30"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          className={cn(
            "h-12 w-12 border-2 transition-all",
            isPresent ? "border-transparent" : "border-absent grayscale"
          )}
        >
          <AvatarImage src={student.avatarUrl} alt={student.name} />
          <AvatarFallback className="bg-muted text-muted-foreground font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div>
          <h3
            className={cn(
              "text-base font-semibold",
              !isPresent && "opacity-70"
            )}
          >
            {student.name}
          </h3>
          <p
            className={cn(
              "text-xs",
              isPresent ? "text-muted-foreground" : "text-absent font-medium"
            )}
          >
            {isPresent ? `ID: ${student.studentId}` : "Marked Absent"}
          </p>
        </div>
      </div>

      <AttendanceToggle
        isPresent={isPresent}
        onToggle={(present) => onToggle(student.id, present)}
        disabled={disabled}
      />
    </div>
  );
}
