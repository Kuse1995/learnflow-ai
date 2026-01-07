import { useFeatureGate } from "@/hooks/useFeatureGate";
import type { FeatureKey } from "@/lib/plan-features";
import { Lock, ArrowUpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeatureGateProps {
  featureKey: FeatureKey;
  classId: string | undefined;
  children: React.ReactNode;
  /** Optional: Show a compact inline lock instead of full upgrade card */
  compact?: boolean;
  /** Optional: Custom fallback component */
  fallback?: React.ReactNode;
}

/**
 * Component that gates access to features based on the school's plan
 * 
 * @example
 * ```tsx
 * <FeatureGate featureKey="teaching_suggestions" classId={classId}>
 *   <TeachingSuggestions />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  featureKey,
  classId,
  children,
  compact = false,
  fallback,
}: FeatureGateProps) {
  const { isAllowed, isLoading, requiredPlanName, featureName, isAIFeature } =
    useFeatureGate(featureKey, classId);

  // While loading, show nothing to prevent flash
  if (isLoading) {
    return null;
  }

  // If allowed, render children
  if (isAllowed) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Compact inline lock
  if (compact) {
    return <CompactUpgradePrompt planName={requiredPlanName} />;
  }

  // Full upgrade card
  return (
    <UpgradeCard
      featureName={featureName}
      planName={requiredPlanName}
      isAIFeature={isAIFeature}
    />
  );
}

interface UpgradeCardProps {
  featureName: string;
  planName: string;
  isAIFeature: boolean;
}

function UpgradeCard({ featureName, planName, isAIFeature }: UpgradeCardProps) {
  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg font-medium">
          {featureName}
          {isAIFeature && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              AI-powered
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          This feature is available on the {planName} plan.
          <br />
          Upgrade to unlock.
        </p>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpCircle className="h-4 w-4" />
          View Plans
        </Button>
      </CardContent>
    </Card>
  );
}

interface CompactUpgradePromptProps {
  planName: string;
}

function CompactUpgradePrompt({ planName }: CompactUpgradePromptProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm">
      <Lock className="h-3 w-3" />
      <span>{planName} plan</span>
    </div>
  );
}

/**
 * Higher-order component for feature gating
 */
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureKey: FeatureKey,
  getClassId: (props: P) => string | undefined
) {
  return function FeatureGatedComponent(props: P) {
    const classId = getClassId(props);

    return (
      <FeatureGate featureKey={featureKey} classId={classId}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}
