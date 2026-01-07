import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "checking";
  message: string;
  lastChecked: Date;
}

export function PerformanceHealthPanel() {
  const { data: healthChecks, isLoading } = useQuery({
    queryKey: ["platform-health"],
    queryFn: async (): Promise<HealthCheck[]> => {
      const checks: HealthCheck[] = [];

      // Database connectivity check
      try {
        const start = Date.now();
        await supabase.from("schools").select("id").limit(1);
        const latency = Date.now() - start;

        checks.push({
          name: "Database",
          status: latency < 500 ? "healthy" : latency < 1000 ? "degraded" : "unhealthy",
          message: `Response time: ${latency}ms`,
          lastChecked: new Date(),
        });
      } catch {
        checks.push({
          name: "Database",
          status: "unhealthy",
          message: "Connection failed",
          lastChecked: new Date(),
        });
      }

      // Storage check
      try {
        const { error } = await supabase.storage.from("uploads").list("", { limit: 1 });
        checks.push({
          name: "File Storage",
          status: error ? "degraded" : "healthy",
          message: error ? "Limited access" : "Operational",
          lastChecked: new Date(),
        });
      } catch {
        checks.push({
          name: "File Storage",
          status: "unhealthy",
          message: "Connection failed",
          lastChecked: new Date(),
        });
      }

      // Check AI controls
      try {
        const { data } = await supabase
          .from("platform_ai_controls")
          .select("ai_globally_enabled, kill_switch_active")
          .single();

        if (data?.kill_switch_active) {
          checks.push({
            name: "AI Services",
            status: "unhealthy",
            message: "Kill switch activated",
            lastChecked: new Date(),
          });
        } else if (!data?.ai_globally_enabled) {
          checks.push({
            name: "AI Services",
            status: "degraded",
            message: "AI globally disabled",
            lastChecked: new Date(),
          });
        } else {
          checks.push({
            name: "AI Services",
            status: "healthy",
            message: "Operational",
            lastChecked: new Date(),
          });
        }
      } catch {
        checks.push({
          name: "AI Services",
          status: "degraded",
          message: "Status unknown",
          lastChecked: new Date(),
        });
      }

      // Check recovery mode
      try {
        const { data } = await supabase
          .from("system_recovery_mode")
          .select("is_active, read_only_mode")
          .single();

        if (data?.is_active) {
          checks.push({
            name: "System Mode",
            status: "unhealthy",
            message: data.read_only_mode ? "Read-only mode" : "Recovery mode active",
            lastChecked: new Date(),
          });
        } else {
          checks.push({
            name: "System Mode",
            status: "healthy",
            message: "Normal operation",
            lastChecked: new Date(),
          });
        }
      } catch {
        checks.push({
          name: "System Mode",
          status: "healthy",
          message: "Normal operation",
          lastChecked: new Date(),
        });
      }

      return checks;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const overallStatus = healthChecks?.reduce((acc, check) => {
    if (check.status === "unhealthy") return "unhealthy";
    if (check.status === "degraded" && acc !== "unhealthy") return "degraded";
    return acc;
  }, "healthy" as "healthy" | "degraded" | "unhealthy");

  if (isLoading) {
    return <HealthPanelSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Real-time platform status</CardDescription>
          </div>
          <OverallStatusBadge status={overallStatus || "healthy"} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {healthChecks?.map((check) => (
            <HealthCheckRow key={check.name} check={check} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface HealthCheckRowProps {
  check: HealthCheck;
}

function HealthCheckRow({ check }: HealthCheckRowProps) {
  const getIcon = () => {
    switch (check.status) {
      case "healthy":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "unhealthy":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className="font-medium text-sm">{check.name}</span>
      </div>
      <span className="text-sm text-muted-foreground">{check.message}</span>
    </div>
  );
}

interface OverallStatusBadgeProps {
  status: "healthy" | "degraded" | "unhealthy";
}

function OverallStatusBadge({ status }: OverallStatusBadgeProps) {
  switch (status) {
    case "healthy":
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          All Systems Operational
        </Badge>
      );
    case "degraded":
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3" />
          Partial Outage
        </Badge>
      );
    case "unhealthy":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Issues Detected
        </Badge>
      );
  }
}

function HealthPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
