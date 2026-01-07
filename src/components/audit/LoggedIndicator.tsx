import { Eye, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LoggedIndicatorProps {
  className?: string;
  tooltip?: string;
  variant?: 'default' | 'subtle';
}

export function LoggedIndicator({ 
  className,
  tooltip = "This action is recorded for transparency and accountability",
  variant = 'default'
}: LoggedIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              variant === 'default' && "text-muted-foreground",
              variant === 'subtle' && "text-muted-foreground/60",
              className
            )}
          >
            <Eye className="h-3 w-3" />
            <span>Logged</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{tooltip}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Wrapper component for sensitive actions
interface LoggedActionProps {
  children: React.ReactNode;
  tooltip?: string;
  showIndicator?: boolean;
  className?: string;
}

export function LoggedAction({ 
  children, 
  tooltip,
  showIndicator = true,
  className 
}: LoggedActionProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {showIndicator && (
        <div className="absolute -top-1 -right-1">
          <LoggedIndicator tooltip={tooltip} variant="subtle" />
        </div>
      )}
    </div>
  );
}
