import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Cloud, CloudOff, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useSyncStatus, type SyncState } from "@/hooks/useSyncStatus";
import { cn } from "@/lib/utils";

interface SyncStatusBadgeProps {
  showRetry?: boolean;
  className?: string;
}

export function SyncStatusBadge({ showRetry = true, className }: SyncStatusBadgeProps) {
  const { syncState, message, pendingCount, failedCount, retryFailed } = useSyncStatus();

  const getIcon = () => {
    switch (syncState) {
      case "synced":
        return <Cloud className="h-3.5 w-3.5" />;
      case "pending":
        return <Cloud className="h-3.5 w-3.5" />;
      case "syncing":
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case "failed":
        return <CloudOff className="h-3.5 w-3.5" />;
    }
  };

  const getVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (syncState) {
      case "synced":
        return "outline";
      case "pending":
        return "secondary";
      case "syncing":
        return "secondary";
      case "failed":
        return "destructive";
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getVariant()} className="gap-1.5 cursor-default">
              {getIcon()}
              {syncState === "pending" && pendingCount > 0 && (
                <span>{pendingCount}</span>
              )}
              {syncState === "synced" && <span>Saved</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{message}</p>
          </TooltipContent>
        </Tooltip>

        {showRetry && syncState === "failed" && failedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={retryFailed}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Connection quality indicator
 */
interface ConnectionIndicatorProps {
  quality: "fast" | "moderate" | "slow" | "offline";
  className?: string;
}

export function ConnectionIndicator({ quality, className }: ConnectionIndicatorProps) {
  const getConfig = () => {
    switch (quality) {
      case "fast":
        return { icon: Cloud, label: "Good connection", variant: "outline" as const };
      case "moderate":
        return { icon: Cloud, label: "Limited connection", variant: "secondary" as const };
      case "slow":
        return { icon: AlertTriangle, label: "Slow connection", variant: "secondary" as const };
      case "offline":
        return { icon: CloudOff, label: "Offline", variant: "destructive" as const };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  if (quality === "fast") return null; // Don't show when connection is good

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={cn("gap-1.5", className)}>
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
