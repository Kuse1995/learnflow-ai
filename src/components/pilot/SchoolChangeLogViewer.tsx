import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSchoolChangeLogs, PHASE_LABELS, type RolloutPhase } from "@/hooks/usePilotDeployment";
import { format } from "date-fns";
import { History, Settings, Pause, Play, ArrowRight, AlertTriangle, Shield } from "lucide-react";

const CHANGE_TYPE_ICONS: Record<string, typeof Settings> = {
  phase_advancement: ArrowRight,
  ai_paused: Pause,
  ai_resumed: Play,
  feature_toggle: Settings,
  incident: AlertTriangle,
  security: Shield,
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  phase_advancement: 'bg-blue-100 text-blue-800',
  ai_paused: 'bg-red-100 text-red-800',
  ai_resumed: 'bg-green-100 text-green-800',
  feature_toggle: 'bg-purple-100 text-purple-800',
  incident: 'bg-amber-100 text-amber-800',
  security: 'bg-slate-100 text-slate-800',
};

interface SchoolChangeLogViewerProps {
  schoolId: string;
  limit?: number;
}

export function SchoolChangeLogViewer({ schoolId, limit = 50 }: SchoolChangeLogViewerProps) {
  const { data: logs, isLoading } = useSchoolChangeLogs(schoolId, limit);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading change logs...
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change Log
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No changes recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Change Log
        </CardTitle>
        <CardDescription>
          History of all changes and events for this pilot school
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {logs.map((log, index) => {
              const Icon = CHANGE_TYPE_ICONS[log.change_type] ?? Settings;
              const colorClass = CHANGE_TYPE_COLORS[log.change_type] ?? 'bg-muted text-muted-foreground';

              return (
                <div
                  key={log.id}
                  className="relative flex gap-4 pb-4 last:pb-0"
                >
                  {/* Timeline connector */}
                  {index < logs.length - 1 && (
                    <div className="absolute left-[15px] top-8 h-full w-[2px] bg-border" />
                  )}

                  {/* Icon */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{log.change_description}</p>
                        {log.rollout_phase && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {PHASE_LABELS[log.rollout_phase as RolloutPhase]}
                          </Badge>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>

                    {/* Previous/New Values */}
                    {(log.previous_value || log.new_value) && (
                      <div className="mt-2 rounded-md bg-muted p-2 text-xs">
                        {log.previous_value && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">From:</span>{' '}
                            {JSON.stringify(log.previous_value)}
                          </div>
                        )}
                        {log.new_value && (
                          <div>
                            <span className="font-medium">To:</span>{' '}
                            {JSON.stringify(log.new_value)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
