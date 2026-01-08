/**
 * System History Viewer for School Admins
 * Read-only view of system changes
 * Soft language: "System History" not "Audit Trail"
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, CreditCard, Settings, Users } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useSchoolSystemHistory, SchoolSystemHistory } from "@/hooks/useSchoolAdmin";

interface SystemHistoryViewerProps {
  schoolId: string;
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case "plan_assigned":
    case "plan_paused":
    case "plan_resumed":
      return <CreditCard className="h-4 w-4" />;
    case "teacher_role_assigned":
    case "teacher_role_removed":
      return <Users className="h-4 w-4" />;
    case "settings_updated":
      return <Settings className="h-4 w-4" />;
    default:
      return <History className="h-4 w-4" />;
  }
}

function getActionBadgeVariant(actionType: string): "default" | "secondary" | "outline" {
  if (actionType.includes("assigned") || actionType.includes("created")) {
    return "default";
  }
  if (actionType.includes("paused") || actionType.includes("removed")) {
    return "secondary";
  }
  return "outline";
}

function HistoryItem({ entry }: { entry: SchoolSystemHistory }) {
  const Icon = getActionIcon(entry.action_type);
  
  return (
    <div className="flex gap-4 py-4 border-b last:border-0">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        {Icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{entry.action_description}</p>
          <Badge variant={getActionBadgeVariant(entry.action_type)} className="shrink-0 text-xs">
            {entry.action_type.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="capitalize">{entry.performed_by_role || "System"}</span>
          <span>•</span>
          <span title={format(new Date(entry.created_at), "PPpp")}>
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SystemHistoryViewer({ schoolId }: SystemHistoryViewerProps) {
  const { data: history, isLoading } = useSchoolSystemHistory(schoolId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">System History</CardTitle>
            <CardDescription>
              A record of changes made to school settings and access
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : history?.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No history recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Changes to plans and settings will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-0">
              {history?.map((entry) => (
                <HistoryItem key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Read-Only Notice */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            📋 This is a read-only record. History cannot be edited or deleted.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
