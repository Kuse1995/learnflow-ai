import { format } from "date-fns";
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerifyAuditChain } from "@/hooks/useAuditLogs";
import { useIntegrityAlerts, useResolveIntegrityAlert } from "@/hooks/useComplianceSettings";
import { useToast } from "@/hooks/use-toast";

interface AuditIntegrityPanelProps {
  environment?: string;
}

export function AuditIntegrityPanel({ environment = 'development' }: AuditIntegrityPanelProps) {
  const { toast } = useToast();
  const { data: chainResult, isLoading: verifying, refetch } = useVerifyAuditChain(environment);
  const { data: alerts, isLoading: alertsLoading } = useIntegrityAlerts();
  const resolveAlert = useResolveIntegrityAlert();

  const isChainValid = chainResult?.[0]?.is_valid ?? true;
  const unresolvedAlerts = alerts?.filter(a => !a.resolved) || [];

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert.mutateAsync(alertId);
      toast({
        title: "Alert resolved",
        description: "The integrity alert has been marked as resolved",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to resolve the alert",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isChainValid ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          )}
          Audit Integrity
        </CardTitle>
        <CardDescription>
          Verify that audit logs have not been tampered with
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Chain Verification Status */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Hash Chain Verification</h3>
              <p className="text-sm text-muted-foreground">
                Environment: <Badge variant="outline">{environment}</Badge>
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={verifying}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
              Verify Now
            </Button>
          </div>
          
          {verifying ? (
            <Skeleton className="h-12 w-full mt-4" />
          ) : isChainValid ? (
            <Alert className="mt-4 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-400">
                Chain Verified
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-500">
                All audit log entries are intact and have not been modified.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="mt-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Chain Broken</AlertTitle>
              <AlertDescription>
                A tampering attempt has been detected. The chain breaks at entry ID: {chainResult?.[0]?.broken_at}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Integrity Alerts */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            Integrity Alerts
            {unresolvedAlerts.length > 0 && (
              <Badge variant="destructive">{unresolvedAlerts.length}</Badge>
            )}
          </h3>
          
          {alertsLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : unresolvedAlerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No unresolved integrity alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unresolvedAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="p-4 border border-destructive/50 rounded-lg bg-destructive/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="destructive" className="mb-2">
                        {alert.alert_type}
                      </Badge>
                      <p className="text-sm font-medium">
                        Detected {format(new Date(alert.detected_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Environment: {alert.environment}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolveAlert.isPending}
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Explanation */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">How this works</h4>
          <p className="text-sm text-muted-foreground">
            Every audit log entry is cryptographically linked to the previous one. 
            If anyone attempts to modify or delete a log entry, the chain breaks and 
            the system detects it immediately. This ensures complete transparency 
            and accountability for all actions in the system.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
