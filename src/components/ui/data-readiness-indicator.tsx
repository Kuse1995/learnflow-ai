import { Sprout, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataReadinessState, DataReadinessResult } from "@/hooks/useDataReadiness";

interface DataReadinessIndicatorProps {
  readiness: DataReadinessResult | undefined;
  isLoading?: boolean;
  className?: string;
}

const stateConfig: Record<DataReadinessState, { 
  icon: typeof Sprout; 
  iconColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  early: {
    icon: Sprout,
    iconColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50/50 dark:bg-amber-950/20",
    borderColor: "border-amber-200/50 dark:border-amber-800/30",
  },
  growing: {
    icon: TrendingUp,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
    borderColor: "border-blue-200/50 dark:border-blue-800/30",
  },
  "well-informed": {
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
  },
};

export function DataReadinessIndicator({ readiness, isLoading, className }: DataReadinessIndicatorProps) {
  if (isLoading || !readiness) {
    return null;
  }

  const config = stateConfig[readiness.state];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "flex items-start gap-2.5 p-3 rounded-lg border",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconColor)} />
      <div className="min-w-0">
        <p className={cn("text-xs font-medium", config.iconColor)}>
          {readiness.label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {readiness.description}
        </p>
      </div>
    </div>
  );
}
