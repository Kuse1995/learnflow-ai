import { useIsSuperAdmin, usePlatformStats, usePlatformAiControls, usePlatformAuditLogs } from "@/hooks/useSuperAdmin";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Building2, GraduationCap, Users, Zap, ShieldAlert, Activity } from "lucide-react";
import { PlatformAdminHeader } from "@/components/platform-admin/PlatformAdminHeader";
import { AiControlsCard } from "@/components/platform-admin/AiControlsCard";
import { RecentAuditLogs } from "@/components/platform-admin/RecentAuditLogs";

export default function PlatformAdminDashboard() {
  const { data: isSuperAdmin, isLoading: checkingAdmin } = useIsSuperAdmin();
  const { data: stats, isLoading: loadingStats } = usePlatformStats();
  const { data: aiControls, isLoading: loadingAi } = usePlatformAiControls();
  const { data: auditLogs, isLoading: loadingLogs } = usePlatformAuditLogs(10);

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PlatformAdminHeader />
      
      <main className="container mx-auto p-6 space-y-6">
        {/* Kill Switch Warning */}
        {aiControls?.kill_switch_active && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">AI KILL SWITCH ACTIVE</p>
              <p className="text-sm text-muted-foreground">
                All AI features are disabled platform-wide. Reason: {aiControls.kill_switch_reason || "No reason provided"}
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalSchools || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.activeSchools || 0} active, {stats?.suspendedSchools || 0} suspended
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">AI Usage (Month)</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.aiUsageThisMonth.ai_generations || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.aiUsageThisMonth.uploads_analyzed || 0} uploads analyzed
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Schools by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Schools by Plan</CardTitle>
            <CardDescription>Distribution of schools across subscription plans</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex flex-wrap gap-4">
                {Object.entries(stats?.schoolsByPlan || {}).map(([plan, count]) => (
                  <div key={plan} className="flex items-center gap-2">
                    <Badge variant={plan === "enterprise" ? "default" : "secondary"}>
                      {plan}
                    </Badge>
                    <span className="text-lg font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(stats?.schoolsByPlan || {}).length === 0 && (
                  <p className="text-muted-foreground">No subscriptions yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Controls */}
          <AiControlsCard controls={aiControls} isLoading={loadingAi} />

          {/* Recent Audit Logs */}
          <RecentAuditLogs logs={auditLogs || []} isLoading={loadingLogs} />
        </div>
      </main>
    </div>
  );
}
