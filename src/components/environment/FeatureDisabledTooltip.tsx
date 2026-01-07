import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock } from "lucide-react";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlags";
import React from "react";

interface FeatureDisabledTooltipProps {
  featureKey: string;
  children: React.ReactNode;
  disabledMessage?: string;
}

export function FeatureDisabledTooltip({
  featureKey,
  children,
  disabledMessage = "This feature is currently unavailable",
}: FeatureDisabledTooltipProps) {
  const isEnabled = useIsFeatureEnabled(featureKey);

  if (isEnabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-block cursor-not-allowed">
            <div className="opacity-50 pointer-events-none">{children}</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{disabledMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Wrapper component that conditionally renders based on feature flag
interface FeatureGatedProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGated({
  featureKey,
  children,
  fallback = null,
}: FeatureGatedProps) {
  const isEnabled = useIsFeatureEnabled(featureKey);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
