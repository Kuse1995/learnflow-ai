/**
 * Incident History Panel
 * 
 * Admin interface for viewing and managing system incidents
 */

import { format, formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Info,
  Eye,
} from 'lucide-react';
import { useActiveIncidents, useIncidentHistory, useResolveIncident, useAcknowledgeIncident } from '@/hooks/useSystemStatus';
import { SystemIncident, calculateIncidentDuration, IncidentSeverity } from '@/lib/system-status';

interface IncidentHistoryPanelProps {
  schoolId?: string;
  userId: string;
}

const SEVERITY_CONFIG: Record<IncidentSeverity, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' }> = {
  info: { icon: <Info className="h-4 w-4" />, variant: 'secondary' },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, variant: 'default' },
  critical: { icon: <AlertCircle className="h-4 w-4" />, variant: 'destructive' },
};

export function IncidentHistoryPanel({ schoolId, userId }: IncidentHistoryPanelProps) {
  const { data: activeIncidents, isLoading: loadingActive } = useActiveIncidents(schoolId);
  const { data: history, isLoading: loadingHistory } = useIncidentHistory(schoolId);
  const resolveIncident = useResolveIncident();
  const acknowledgeIncident = useAcknowledgeIncident();

  const handleResolve = (incident: SystemIncident) => {
    resolveIncident.mutate({
      incidentId: incident.id,
      resolutionAction: 'Manually resolved by admin',
      schoolId,
    });
  };

  const handleAcknowledge = (incident: SystemIncident) => {
    acknowledgeIncident.mutate({
      incidentId: incident.id,
      acknowledgedBy: userId,
      schoolId,
    });
  };

  if (loadingActive || loadingHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incident History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Incidents */}
      {activeIncidents && activeIncidents.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Active Incidents ({activeIncidents.length})
            </CardTitle>
            <CardDescription>
              Current issues requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  isActive
                  onResolve={handleResolve}
                  onAcknowledge={handleAcknowledge}
                  isPending={resolveIncident.isPending || acknowledgeIncident.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incident History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Incident History
          </CardTitle>
          <CardDescription>
            Past incidents and their resolutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <div className="space-y-3">
              {history.filter(i => i.resolved_at).map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  isActive={false}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No incidents recorded. That's good news!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IncidentCard({
  incident,
  isActive,
  onResolve,
  onAcknowledge,
  isPending,
}: {
  incident: SystemIncident;
  isActive: boolean;
  onResolve?: (i: SystemIncident) => void;
  onAcknowledge?: (i: SystemIncident) => void;
  isPending?: boolean;
}) {
  const severity = SEVERITY_CONFIG[incident.severity];
  const duration = calculateIncidentDuration(incident);

  return (
    <div className={`p-4 border rounded-lg ${isActive ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {severity.icon}
            <span className="font-medium capitalize">
              {incident.incident_type.replace(/_/g, ' ')}
            </span>
            <Badge variant={severity.variant}>
              {incident.severity}
            </Badge>
            {incident.resolved_at && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            {incident.user_message}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Detected {formatDistanceToNow(new Date(incident.detected_at))} ago
            </span>
            <span>Duration: {duration}</span>
            {incident.affected_services.length > 0 && (
              <span>Affected: {incident.affected_services.join(', ')}</span>
            )}
          </div>

          {incident.resolution_action && (
            <p className="text-sm text-green-600 mt-2">
              Resolution: {incident.resolution_action}
            </p>
          )}

          {incident.acknowledged_by && (
            <p className="text-xs text-muted-foreground">
              Acknowledged at {format(new Date(incident.acknowledged_at!), 'h:mm a')}
            </p>
          )}
        </div>

        {isActive && (
          <div className="flex gap-2">
            {!incident.acknowledged_by && onAcknowledge && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAcknowledge(incident)}
                disabled={isPending}
              >
                <Eye className="mr-2 h-4 w-4" />
                Acknowledge
              </Button>
            )}
            {onResolve && (
              <Button
                size="sm"
                onClick={() => onResolve(incident)}
                disabled={isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Resolve
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
