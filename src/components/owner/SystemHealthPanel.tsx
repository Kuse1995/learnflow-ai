import { useSystemHealth, useSystemMode } from '@/hooks/useOwnerControls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export function SystemHealthPanel() {
  const { data: health, isLoading: loadingHealth } = useSystemHealth();
  const { data: systemMode, isLoading: loadingMode } = useSystemMode();

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'error') => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Degraded</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>System Health</CardTitle>
        </div>
        <CardDescription>Real-time system diagnostics and status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingHealth || loadingMode ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            {/* System Mode */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {systemMode === 'production' ? (
                  <ToggleRight className="h-5 w-5 text-green-500" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium">System Mode</p>
                  <p className="text-xs text-muted-foreground">Current operational mode</p>
                </div>
              </div>
              <Badge className={systemMode === 'production' 
                ? 'bg-green-100 text-green-700 border-green-200' 
                : 'bg-amber-100 text-amber-700 border-amber-200'
              }>
                {systemMode === 'production' ? 'Production' : 'Demo'}
              </Badge>
            </div>

            {/* Database Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {getStatusIcon(health?.databaseStatus || 'healthy')}
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-muted-foreground">Connection status</p>
                </div>
              </div>
              {getStatusBadge(health?.databaseStatus || 'healthy')}
            </div>

            {/* Feature Flags Summary */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Feature Flags</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {health?.featureFlags.slice(0, 6).map((flag) => (
                  <Badge 
                    key={flag.key} 
                    variant="outline"
                    className={flag.enabled 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-muted text-muted-foreground'
                    }
                  >
                    {flag.key.replace(/_/g, ' ')}
                    {flag.enabled ? ' ✓' : ' ✗'}
                  </Badge>
                ))}
                {(health?.featureFlags.length || 0) > 6 && (
                  <Badge variant="outline">+{(health?.featureFlags.length || 0) - 6} more</Badge>
                )}
              </div>
            </div>

            {/* Last Errors */}
            {health?.lastErrors && health.lastErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-2">Recent Errors</p>
                <ul className="space-y-1">
                  {health.lastErrors.slice(0, 5).map((error, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      <span className="text-destructive">[{error.type}]</span> {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
