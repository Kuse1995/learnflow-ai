import { useSchoolPlanByClass } from "@/hooks/useSchoolPlan";
import { useSchoolBilling, useUsageLimit } from "@/hooks/useUsageLimits";
import type { UsageMetric } from "@/lib/usage-limits";
import { USAGE_LIMIT_COPY } from "@/lib/usage-limits";
import { Lock, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UsageGateProps {
  classId: string | undefined;
  metric: UsageMetric;
  children: React.ReactNode;
  /** Show usage indicator alongside content */
  showIndicator?: boolean;
}

/**
 * Component that gates access based on billing status and usage limits
 * MUST wrap any AI action buttons or forms
 */
export function UsageGate({
  classId,
  metric,
  children,
  showIndicator = false,
}: UsageGateProps) {
  const { data: school, isLoading: schoolLoading } = useSchoolPlanByClass(classId);
  const { data: billing, isLoading: billingLoading } = useSchoolBilling(school?.id);
  const usage = useUsageLimit(school?.id, school?.plan, metric);

  const isLoading = schoolLoading || billingLoading;

  if (isLoading) {
    return null;
  }

  // Check suspended status
  if (billing?.billing_status === "suspended") {
    return <SuspendedCard />;
  }

  // Check trial expiration
  if (billing?.billing_status === "trial" && billing.billing_end_date) {
    const endDate = new Date(billing.billing_end_date);
    if (endDate < new Date()) {
      return <TrialExpiredCard />;
    }
  }

  // Check usage limit
  if (usage?.isAtLimit) {
    return <LimitExceededCard metric={metric} usage={usage} />;
  }

  // Allowed - render children with optional indicator
  if (showIndicator && usage) {
    return (
      <div className="space-y-2">
        {children}
        <UsageIndicator usage={usage} />
      </div>
    );
  }

  return <>{children}</>;
}

function SuspendedCard() {
  return (
    <Card className="border-dashed border-destructive/30 bg-destructive/5">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <Lock className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-lg font-medium">Account Suspended</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          {USAGE_LIMIT_COPY.suspended}
        </p>
        <Button variant="outline" size="sm">
          Contact Support
        </Button>
      </CardContent>
    </Card>
  );
}

function TrialExpiredCard() {
  return (
    <Card className="border-dashed border-warning/30 bg-warning/5">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle className="h-6 w-6 text-warning" />
        </div>
        <CardTitle className="text-lg font-medium">Trial Expired</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          {USAGE_LIMIT_COPY.trialExpired}
        </p>
        <Button variant="default" size="sm">
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
}

interface LimitExceededCardProps {
  metric: UsageMetric;
  usage: {
    current: number;
    limit: number;
    percentage: number;
  };
}

function LimitExceededCard({ usage }: LimitExceededCardProps) {
  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg font-medium">Monthly Limit Reached</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-3">
        <div className="space-y-1">
          <Progress value={100} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {usage.current} / {usage.limit} used this month
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {USAGE_LIMIT_COPY.limitExceeded}
        </p>
        <Button variant="default" size="sm">
          Upgrade Plan
        </Button>
      </CardContent>
    </Card>
  );
}

interface UsageIndicatorProps {
  usage: {
    current: number;
    limit: number;
    percentage: number;
    isNearLimit: boolean;
    formattedRemaining: string;
  };
}

function UsageIndicator({ usage }: UsageIndicatorProps) {
  if (usage.limit === -1) {
    return null; // Don't show for unlimited
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Progress 
        value={usage.percentage} 
        className={`h-1.5 flex-1 max-w-24 ${usage.isNearLimit ? "[&>div]:bg-warning" : ""}`} 
      />
      <span>{usage.formattedRemaining}</span>
    </div>
  );
}

/**
 * Simple hook-based check for usage limits
 * Use this for disabling buttons
 */
export function useCanPerformUsageAction(
  classId: string | undefined,
  metric: UsageMetric
): { canPerform: boolean; isLoading: boolean; message: string | null } {
  const { data: school, isLoading: schoolLoading } = useSchoolPlanByClass(classId);
  const { data: billing, isLoading: billingLoading } = useSchoolBilling(school?.id);
  const usage = useUsageLimit(school?.id, school?.plan, metric);

  const isLoading = schoolLoading || billingLoading;

  if (isLoading) {
    return { canPerform: false, isLoading: true, message: null };
  }

  if (billing?.billing_status === "suspended") {
    return { canPerform: false, isLoading: false, message: USAGE_LIMIT_COPY.suspended };
  }

  if (billing?.billing_status === "trial" && billing.billing_end_date) {
    const endDate = new Date(billing.billing_end_date);
    if (endDate < new Date()) {
      return { canPerform: false, isLoading: false, message: USAGE_LIMIT_COPY.trialExpired };
    }
  }

  if (usage?.isAtLimit) {
    return { canPerform: false, isLoading: false, message: USAGE_LIMIT_COPY.limitExceeded };
  }

  return { canPerform: true, isLoading: false, message: null };
}
