import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeploymentChecks, useUpdateDeploymentCheck } from "@/hooks/useFeatureFlags";
import { CheckCircle, XCircle, Clock, SkipForward, RefreshCw, Shield, Rocket, RotateCcw } from "lucide-react";
import { format } from "date-fns";

export function DeploymentChecksPanel() {
  const { data: checks, isLoading, refetch } = useDeploymentChecks();
  const updateCheck = useUpdateDeploymentCheck();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deployment Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const preDeployChecks = checks?.filter((c) => c.check_type === "pre_deploy") || [];
  const postDeployChecks = checks?.filter((c) => c.check_type === "post_deploy") || [];
  const rollbackChecks = checks?.filter((c) => c.check_type === "rollback") || [];

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      label: "Pending",
    },
    passed: {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      label: "Passed",
    },
    failed: {
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      label: "Failed",
    },
    skipped: {
      icon: SkipForward,
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      label: "Skipped",
    },
  };

  const renderCheckSection = (
    title: string,
    icon: React.ReactNode,
    sectionChecks: typeof checks
  ) => {
    if (!sectionChecks?.length) return null;

    return (
      <div>
        <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          {icon}
          {title}
        </h4>
        <div className="space-y-2">
          {sectionChecks.map((check) => {
            const config = statusConfig[check.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={check.id}
                className={`flex items-center justify-between p-3 rounded-lg ${config.bgColor}`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon className={`h-5 w-5 ${config.color}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {check.check_name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      {check.is_blocking && (
                        <Badge variant="outline" className="text-xs">
                          Blocking
                        </Badge>
                      )}
                    </div>
                    {check.description && (
                      <p className="text-xs text-muted-foreground">
                        {check.description}
                      </p>
                    )}
                    {check.last_checked_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last checked: {format(new Date(check.last_checked_at), "PPp")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateCheck.mutate({
                        checkId: check.id,
                        status: "passed",
                      })
                    }
                    disabled={updateCheck.isPending}
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateCheck.mutate({
                        checkId: check.id,
                        status: "failed",
                      })
                    }
                    disabled={updateCheck.isPending}
                  >
                    <XCircle className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const allPreDeployPassed = preDeployChecks.every(
    (c) => c.status === "passed" || (!c.is_blocking && c.status === "skipped")
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Deployment Checks
          </CardTitle>
          <CardDescription>
            Safety checks before and after deployment
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderCheckSection(
          "Pre-Deployment Checks",
          <Rocket className="h-4 w-4" />,
          preDeployChecks
        )}
        {renderCheckSection(
          "Post-Deployment Checks",
          <CheckCircle className="h-4 w-4" />,
          postDeployChecks
        )}
        {renderCheckSection(
          "Rollback Checks",
          <RotateCcw className="h-4 w-4" />,
          rollbackChecks
        )}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Deployment Status</p>
              <p className="text-sm text-muted-foreground">
                {allPreDeployPassed
                  ? "All pre-deployment checks passed. Ready to deploy."
                  : "Some checks are pending or failed. Review before deploying."}
              </p>
            </div>
            <Badge variant={allPreDeployPassed ? "default" : "secondary"}>
              {allPreDeployPassed ? "Ready" : "Not Ready"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
