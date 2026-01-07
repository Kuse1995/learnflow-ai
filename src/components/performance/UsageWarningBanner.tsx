import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, XCircle } from "lucide-react";
import { getUsageWarningLevel, getUsageMessage, USAGE_THRESHOLDS } from "@/lib/performance-config";
import { cn } from "@/lib/utils";

interface UsageWarningBannerProps {
  metric: string;
  current: number;
  limit: number;
  onUpgrade?: () => void;
  className?: string;
}

export function UsageWarningBanner({
  metric,
  current,
  limit,
  onUpgrade,
  className,
}: UsageWarningBannerProps) {
  if (limit === -1) return null; // Unlimited

  const percentage = Math.min(100, Math.round((current / limit) * 100));
  const level = getUsageWarningLevel(percentage);
  const message = getUsageMessage(percentage);

  if (level === "none") return null;

  const getIcon = () => {
    switch (level) {
      case "warning":
        return <TrendingUp className="h-4 w-4" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      case "exceeded":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getVariant = () => {
    switch (level) {
      case "warning":
        return "default";
      case "critical":
        return "destructive";
      case "exceeded":
        return "destructive";
      default:
        return "default";
    }
  };

  const formatMetricName = (m: string) => {
    return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Alert variant={getVariant()} className={cn("", className)}>
      {getIcon()}
      <AlertTitle className="flex items-center justify-between">
        <span>{formatMetricName(metric)}</span>
        <span className="text-sm font-normal">
          {current} / {limit}
        </span>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <Progress
          value={percentage}
          className={cn(
            "h-2",
            level === "warning" && "[&>div]:bg-yellow-500",
            level === "critical" && "[&>div]:bg-orange-500",
            level === "exceeded" && "[&>div]:bg-destructive"
          )}
        />
        <p className="text-sm">{message}</p>
        {onUpgrade && level !== "warning" && (
          <Button size="sm" variant="outline" onClick={onUpgrade}>
            Upgrade Plan
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact inline usage indicator
 */
interface UsageIndicatorInlineProps {
  current: number;
  limit: number;
  label?: string;
  className?: string;
}

export function UsageIndicatorInline({
  current,
  limit,
  label,
  className,
}: UsageIndicatorInlineProps) {
  if (limit === -1) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {label && `${label}: `}Unlimited
      </span>
    );
  }

  const percentage = Math.min(100, Math.round((current / limit) * 100));
  const level = getUsageWarningLevel(percentage);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <Progress
        value={percentage}
        className={cn(
          "h-1.5 w-16",
          level === "warning" && "[&>div]:bg-yellow-500",
          level === "critical" && "[&>div]:bg-orange-500",
          level === "exceeded" && "[&>div]:bg-destructive"
        )}
      />
      <span
        className={cn(
          "text-xs",
          level === "none" && "text-muted-foreground",
          level === "warning" && "text-yellow-600",
          level === "critical" && "text-orange-600",
          level === "exceeded" && "text-destructive"
        )}
      >
        {current}/{limit}
      </span>
    </div>
  );
}

/**
 * Quota warning toast content
 */
interface QuotaWarningContentProps {
  metric: string;
  percentage: number;
}

export function QuotaWarningContent({ metric, percentage }: QuotaWarningContentProps) {
  const level = getUsageWarningLevel(percentage);
  const message = getUsageMessage(percentage);

  return (
    <div className="flex items-start gap-3">
      {level === "critical" ? (
        <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
      ) : (
        <TrendingUp className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
      )}
      <div>
        <p className="font-medium text-sm">
          {metric.replace(/_/g, " ")} Usage
        </p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
