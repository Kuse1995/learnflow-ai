import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Users, 
  School, 
  Cpu, 
  TrendingUp,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { usePlatformUsageSummary, useAiCostBreakdown } from "@/hooks/useAdminMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import type { SaaSPlan } from "@/lib/plan-features";

export function UsageMetricsDashboard() {
  const { data: summary, isLoading } = usePlatformUsageSummary();
  const { data: aiBreakdown, isLoading: aiLoading } = useAiCostBreakdown();

  if (isLoading) {
    return <UsageMetricsSkeleton />;
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No usage data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Schools"
          value={summary.totalSchools}
          icon={School}
          description="Active schools on platform"
        />
        <MetricCard
          title="Total Students"
          value={summary.totalStudents.toLocaleString()}
          icon={Users}
          description="Across all schools"
        />
        <MetricCard
          title="AI Calls This Month"
          value={summary.totalAiCalls.toLocaleString()}
          icon={Cpu}
          description="Total AI generations"
        />
        <MetricCard
          title="Health Status"
          value={summary.schoolsAtLimit === 0 ? "Good" : "Attention"}
          icon={Activity}
          description={`${summary.schoolsNearLimit} near limit, ${summary.schoolsAtLimit} at limit`}
          variant={summary.schoolsAtLimit > 0 ? "warning" : "default"}
        />
      </div>

      {/* Limit Warnings */}
      {(summary.schoolsNearLimit > 0 || summary.schoolsAtLimit > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Usage Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {summary.schoolsNearLimit > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {summary.schoolsNearLimit} schools approaching limits
                </Badge>
              )}
              {summary.schoolsAtLimit > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {summary.schoolsAtLimit} schools at limit
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Distribution</CardTitle>
          <CardDescription>Schools by subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(Object.entries(summary.planDistribution) as [SaaSPlan, number][]).map(
              ([plan, count]) => (
                <PlanDistributionRow
                  key={plan}
                  plan={plan}
                  count={count}
                  total={summary.totalSchools}
                />
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>AI Usage by Feature</CardTitle>
          <CardDescription>This month's consumption breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {aiLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : aiBreakdown ? (
            <div className="space-y-4">
              <AiUsageRow
                label="Upload Analysis"
                value={aiBreakdown.uploads_analyzed}
                color="bg-blue-500"
              />
              <AiUsageRow
                label="AI Generations"
                value={aiBreakdown.ai_generations}
                color="bg-green-500"
              />
              <AiUsageRow
                label="Parent Insights"
                value={aiBreakdown.parent_insights_generated}
                color="bg-purple-500"
              />
              <AiUsageRow
                label="Support Plans"
                value={aiBreakdown.adaptive_support_plans_generated}
                color="bg-orange-500"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: "default" | "warning";
}

function MetricCard({ title, value, icon: Icon, description, variant = "default" }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variant === "warning" ? "text-warning" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === "warning" ? "text-warning" : ""}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface PlanDistributionRowProps {
  plan: SaaSPlan;
  count: number;
  total: number;
}

function PlanDistributionRow({ plan, count, total }: PlanDistributionRowProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  const planColors: Record<SaaSPlan, string> = {
    basic: "bg-gray-500",
    standard: "bg-blue-500",
    premium: "bg-purple-500",
    enterprise: "bg-green-500",
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="capitalize font-medium">{plan}</span>
        <span className="text-muted-foreground">
          {count} schools ({percentage}%)
        </span>
      </div>
      <Progress
        value={percentage}
        className={`h-2 [&>div]:${planColors[plan]}`}
      />
    </div>
  );
}

interface AiUsageRowProps {
  label: string;
  value: number;
  color: string;
}

function AiUsageRow({ label, value, color }: AiUsageRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">
        {value.toLocaleString()} calls
      </span>
    </div>
  );
}

function UsageMetricsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
