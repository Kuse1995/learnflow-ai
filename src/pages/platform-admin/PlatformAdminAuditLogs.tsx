import { useIsSuperAdmin, usePlatformAuditLogs } from "@/hooks/useSuperAdmin";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlatformAdminHeader } from "@/components/platform-admin/PlatformAdminHeader";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";
import type { PlatformAuditLog } from "@/types/platform-admin";

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

export default function PlatformAdminAuditLogs() {
  const { data: isSuperAdmin, isLoading: checkingAdmin } = useIsSuperAdmin();
  const { data: logs, isLoading: loadingLogs } = usePlatformAuditLogs(100);

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScrollText className="h-6 w-6" />
              Audit Logs
            </h1>
            <p className="text-muted-foreground">
              Complete history of all platform admin actions
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loadingLogs ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target School</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No audit logs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs?.map((log: PlatformAuditLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ACTION_COLORS[log.action] || "outline"}>
                            {formatAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.school?.name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {log.actor?.email || log.actor_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.reason || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {(log.previous_state || log.new_state) ? (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-primary hover:underline">
                                View changes
                              </summary>
                              <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                                {log.previous_state && (
                                  <div>
                                    <span className="text-destructive">-</span>{" "}
                                    {JSON.stringify(log.previous_state)}
                                  </div>
                                )}
                                {log.new_state && (
                                  <div>
                                    <span className="text-green-500">+</span>{" "}
                                    {JSON.stringify(log.new_state)}
                                  </div>
                                )}
                              </div>
                            </details>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
