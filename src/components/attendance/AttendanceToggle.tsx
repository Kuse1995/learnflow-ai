import { cn } from "@/lib/utils";

interface AttendanceToggleProps {
  isPresent: boolean;
  onToggle: (present: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Canonical attendance toggle component.
 * Pattern: tap to toggle between Present/Absent states.
 * Reused across web and mobile views.
 */
export function AttendanceToggle({
  isPresent,
  onToggle,
  disabled = false,
  className,
}: AttendanceToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPresent}
      aria-label={isPresent ? "Mark as absent" : "Mark as present"}
      disabled={disabled}
      onClick={() => onToggle(!isPresent)}
      className={cn(
        "relative inline-flex h-9 w-24 items-center rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isPresent ? "bg-primary/20" : "bg-muted",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Sliding indicator */}
      <span
        className={cn(
          "absolute top-1 h-7 w-11 rounded shadow-sm transition-all duration-300",
          isPresent 
            ? "left-12 bg-primary" 
            : "left-1 bg-absent"
        )}
      />
      
      {/* Labels */}
      <span
        className={cn(
          "z-10 w-11 text-center text-[10px] font-bold uppercase transition-colors",
          !isPresent ? "text-card" : "text-muted-foreground"
        )}
      >
        Abs
      </span>
      <span
        className={cn(
          "z-10 w-11 text-center text-[10px] font-bold uppercase transition-colors",
          isPresent ? "text-card" : "text-muted-foreground"
        )}
      >
        Pre
      </span>
    </button>
  );
}
