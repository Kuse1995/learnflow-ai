/**
 * Demo Mode Banner
 * 
 * A banner that displays when viewing demo data.
 * Shows appropriate messaging based on context (admin/teacher/parent).
 */

import { FlaskConical, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDemoBadgeConfig } from "@/hooks/useDemoSafety";

interface DemoModeBannerProps {
  schoolId: string | undefined;
  context: 'admin' | 'teacher' | 'parent';
  className?: string;
}

export function DemoModeBanner({ schoolId, context, className }: DemoModeBannerProps) {
  const { show, variant, tooltip, isLoading } = useDemoBadgeConfig(schoolId, context);

  if (isLoading || !show) return null;

  if (variant === 'subtle') {
    // Subtle variant for parent view
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 ${className ?? ""}`}
            >
              <FlaskConical className="h-3 w-3" />
              <span>Demo</span>
              <Info className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Prominent variant for admin/teacher
  return (
    <Alert
      className={`bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-700 ${className ?? ""}`}
    >
      <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-300 flex items-center gap-2">
        <span className="font-medium">Demo Mode</span>
        <span className="text-amber-700 dark:text-amber-400">—</span>
        <span>{tooltip}</span>
      </AlertDescription>
    </Alert>
  );
}
