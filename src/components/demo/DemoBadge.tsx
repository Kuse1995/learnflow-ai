import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

interface DemoBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Visual indicator for demo schools.
 * Clearly labels demo data to distinguish from real school data.
 */
export function DemoBadge({ className, size = "md" }: DemoBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700 ${
        size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"
      } ${className ?? ""}`}
    >
      <FlaskConical className={size === "sm" ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1.5"} />
      Demo
    </Badge>
  );
}

/**
 * Hook to check if a school is a demo school
 */
export function isDemoSchool(school: { is_demo?: boolean } | null | undefined): boolean {
  return school?.is_demo === true;
}
