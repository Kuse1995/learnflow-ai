import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemStatus, useErrorCodes } from "@/hooks/useLaunchMode";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Wrench,
  RefreshCw,
  Server,
  Database,
  Shield,
  HardDrive,
  Cloud,
  Copy
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  operational: {
    icon: CheckCircle,
    label: "Operational",
    variant: "default" as const,
    className: "bg-green-100 text-green-800 border-green-300",
  },
  degraded: {
    icon: AlertTriangle,
    label: "Degraded",
    variant: "secondary" as const,
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  outage: {
    icon: XCircle,
    label: "Outage",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 border-red-300",
  },
  maintenance: {
    icon: Wrench,
    label: "Maintenance",
    variant: "outline" as const,
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
};

const COMPONENT_ICONS: Record<string, typeof Server> = {
  Database: Database,
  Authentication: Shield,
  'AI Services': Cloud,
  'File Storage': HardDrive,
  'Backup System': RefreshCw,
};

export function SystemStatusPanel() {
  const { data: statuses, isLoading: statusLoading, refetch } = useSystemStatus();
  const { data: errorCodes, isLoading: codesLoading } = useErrorCodes();

  const copyErrorCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Error code ${code} copied`);
  };

  if (statusLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const overallStatus = statuses?.every(s => s.status === 'operational')
    ? 'operational'
    : statuses?.some(s => s.status === 'outage')
    ? 'outage'
    : 'degraded';

  const OverallIcon = STATUS_CONFIG[overallStatus].icon;

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OverallIcon className={`h-6 w-6 ${
                overallStatus === 'operational' ? 'text-green-600' :
                overallStatus === 'outage' ? 'text-red-600' : 'text-amber-600'
              }`} />
              <div>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  {overallStatus === 'operational' 
                    ? 'All systems operational'
                    : 'Some systems experiencing issues'}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {statuses?.map((status) => {
              const config = STATUS_CONFIG[status.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.operational;
              const Icon = COMPONENT_ICONS[status.component] || Server;
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{status.component}</p>
                      {status.message && (
                        <p className="text-xs text-muted-foreground">{status.message}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={config.variant} className={config.className}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error Codes Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Error Codes Reference</CardTitle>
          <CardDescription>
            Use these codes when helping users with support calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          {codesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-3">
              {errorCodes?.map((code) => (
                <div
                  key={code.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={code.severity === 'error' ? 'destructive' : 
                                   code.severity === 'warning' ? 'secondary' : 'outline'}
                          className="font-mono"
                        >
                          {code.code}
                        </Badge>
                        <span className="text-sm font-medium">{code.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {code.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {code.description}
                      </p>
                      {code.resolution_steps?.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <strong>Resolution:</strong>{' '}
                          {code.resolution_steps.join(' → ')}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyErrorCode(code.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
