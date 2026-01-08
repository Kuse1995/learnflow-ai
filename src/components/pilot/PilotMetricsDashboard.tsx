import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePilotMetrics, usePilotExitCriteria } from "@/hooks/usePilotDeployment";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Upload,
  Brain,
  CheckCircle2,
  XCircle,
  Activity,
  Users,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface PilotMetricsDashboardProps {
  schoolId: string;
}

export function PilotMetricsDashboard({ schoolId }: PilotMetricsDashboardProps) {
  const { data: metrics, isLoading: metricsLoading } = usePilotMetrics(schoolId, 30);
  const { data: exitCriteria, isLoading: criteriaLoading } = usePilotExitCriteria(schoolId);

  if (metricsLoading || criteriaLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading pilot metrics...
        </CardContent>
      </Card>
    );
  }

  // Calculate aggregates
  const totals = metrics?.reduce(
    (acc, day) => ({
      uploads: acc.uploads + day.upload_count,
      analysisSuccess: acc.analysisSuccess + day.analysis_success_count,
      analysisFailure: acc.analysisFailure + day.analysis_failure_count,
      aiGenerations: acc.aiGenerations + day.ai_generation_count,
      teacherActions: acc.teacherActions + day.teacher_action_count,
      errors: acc.errors + day.error_count,
    }),
    {
      uploads: 0,
      analysisSuccess: 0,
      analysisFailure: 0,
      aiGenerations: 0,
      teacherActions: 0,
      errors: 0,
    }
  ) ?? {
    uploads: 0,
    analysisSuccess: 0,
    analysisFailure: 0,
    aiGenerations: 0,
    teacherActions: 0,
    errors: 0,
  };

  const successRate =
    totals.analysisSuccess + totals.analysisFailure > 0
      ? (
          (totals.analysisSuccess / (totals.analysisSuccess + totals.analysisFailure)) *
          100
        ).toFixed(1)
      : "N/A";

  const chartData = metrics?.map((day) => ({
    date: format(parseISO(day.metric_date), "MMM d"),
    uploads: day.upload_count,
    analyses: day.analysis_success_count,
    failures: day.analysis_failure_count,
    aiCalls: day.ai_generation_count,
    teacherActions: day.teacher_action_count,
    errors: day.error_count,
    activeTeachers: day.active_teacher_count,
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.uploads}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Analysis Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totals.analysisSuccess} of {totals.analysisSuccess + totals.analysisFailure}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Generations</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.aiGenerations}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Error Count</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.errors}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Upload and analysis activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="uploads" name="Uploads" fill="hsl(var(--primary))" />
                  <Bar dataKey="analyses" name="Successful Analyses" fill="hsl(142 76% 36%)" />
                  <Bar dataKey="failures" name="Failed Analyses" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Activity Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Teacher Engagement</CardTitle>
            <CardDescription>Teacher actions and active teachers over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="teacherActions"
                    name="Teacher Actions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeTeachers"
                    name="Active Teachers"
                    stroke="hsl(262 83% 58%)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exit Criteria */}
      {exitCriteria && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Exit Criteria</span>
              <Badge variant={exitCriteria.all_criteria_met ? "default" : "secondary"}>
                {exitCriteria.all_criteria_met ? "All Met" : "In Progress"}
              </Badge>
            </CardTitle>
            <CardDescription>Readiness checks for pilot completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Uptime */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {exitCriteria.uptime_met ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">System Uptime</p>
                    <p className="text-sm text-muted-foreground">
                      Target: ≥{exitCriteria.uptime_target_percent}%
                    </p>
                  </div>
                </div>
                <Badge variant={exitCriteria.uptime_met ? "default" : "outline"}>
                  {exitCriteria.current_uptime_percent ?? "N/A"}%
                </Badge>
              </div>

              {/* Teacher Usage */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {exitCriteria.teacher_usage_met ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Teacher Usage</p>
                    <p className="text-sm text-muted-foreground">
                      Target: ≥{exitCriteria.min_active_teachers} active teachers
                    </p>
                  </div>
                </div>
                <Badge variant={exitCriteria.teacher_usage_met ? "default" : "outline"}>
                  {exitCriteria.current_active_teachers} teachers
                </Badge>
              </div>

              {/* Error Rate */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {exitCriteria.error_rate_met ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Error Rate</p>
                    <p className="text-sm text-muted-foreground">
                      Target: ≤{exitCriteria.max_error_rate_percent}%
                    </p>
                  </div>
                </div>
                <Badge variant={exitCriteria.error_rate_met ? "default" : "outline"}>
                  {exitCriteria.current_error_rate_percent ?? "N/A"}%
                </Badge>
              </div>

              {/* Parent Readiness */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {exitCriteria.parent_readiness_met ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Parent Readiness</p>
                    <p className="text-sm text-muted-foreground">
                      Features tested and satisfaction measured
                    </p>
                  </div>
                </div>
                <Badge variant={exitCriteria.parent_readiness_met ? "default" : "outline"}>
                  {exitCriteria.parent_features_tested ? "Tested" : "Not Tested"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
