import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { PlatformAuditLog } from "@/types/platform-admin";

interface RecentAuditLogsProps {
  logs: PlatformAuditLog[];
  isLoading: boolean;
}

const ACTION_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  plan_activated: "default",
  plan_changed: "secondary",
  school_suspended: "destructive",
  school_reinstated: "default",
  subscription_extended: "secondary",
  ai_toggle_changed: "outline",
  ai_kill_switch_activated: "destructive",
  ai_kill_switch_deactivated: "default",
  super_admin_action: "outline",
  override_applied: "secondary",
  school_archived: "destructive",
};

function formatAction(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function RecentAuditLogs({ logs, isLoading }: RecentAuditLogsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest platform admin actions</CardDescription>
        </div>
        <Link
          to="/platform-admin/audit-logs"
          className="text-sm text-primary hover:underline"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-2 rounded border text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={ACTION_COLORS[log.action] || "outline"}>
                      {formatAction(log.action)}
                    </Badge>
                    {log.school && (
                      <span className="text-muted-foreground">
                        → {log.school.name}
                      </span>
                    )}
                  </div>
                  {log.reason && (
                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                      {log.reason}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
