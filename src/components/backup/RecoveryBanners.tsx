import { AlertTriangle, WifiOff, RefreshCw, Upload, X, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSystemRecoveryMode, useToggleRecoveryMode } from "@/hooks/useBackups";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { cn } from "@/lib/utils";

export function RecoveryModeBanner() {
  const { data: recoveryMode, isLoading } = useSystemRecoveryMode();
  const toggleRecovery = useToggleRecoveryMode();

  if (isLoading || !recoveryMode?.is_active) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-amber-50 py-3 px-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" />
          <div>
            <span className="font-medium">System Recovery Mode Active</span>
            {recoveryMode.reason && (
              <span className="ml-2 opacity-90">— {recoveryMode.reason}</span>
            )}
          </div>
          {recoveryMode.read_only_mode && (
            <Badge variant="outline" className="bg-amber-600 border-amber-400">
              Read-Only
            </Badge>
          )}
        </div>
        
        {recoveryMode.expected_resolution && (
          <span className="text-sm opacity-90">
            Expected resolution: {recoveryMode.expected_resolution}
          </span>
        )}
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  const { isOnline, wasOffline, pendingUploads, syncPendingUploads, dismissOfflineNotice } = useOfflineMode();

  // Currently offline
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 max-w-sm">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">
            You're Offline
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Don't worry — your work is being saved locally and will sync when you're back online.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Just came back online with pending uploads
  if (wasOffline && pendingUploads > 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 max-w-sm">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">
            Welcome Back!
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            You have {pendingUploads} item(s) saved while offline.
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={syncPendingUploads}>
                <Upload className="h-3 w-3 mr-1" />
                Sync Now
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissOfflineNotice}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Just came back online, all synced
  if (wasOffline && pendingUploads === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 max-w-sm">
          <RefreshCw className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-300">
            You're Back Online
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            All your data has been synced successfully.
            <Button 
              size="sm" 
              variant="ghost" 
              className="ml-2" 
              onClick={dismissOfflineNotice}
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}

// Admin panel for recovery mode control
interface RecoveryModeControlProps {
  className?: string;
}

export function RecoveryModeControl({ className }: RecoveryModeControlProps) {
  const { data: recoveryMode, isLoading } = useSystemRecoveryMode();
  const toggleRecovery = useToggleRecoveryMode();

  if (isLoading) {
    return null;
  }

  const handleToggle = async () => {
    await toggleRecovery.mutateAsync({
      is_active: !recoveryMode?.is_active,
      reason: recoveryMode?.is_active ? undefined : 'Manual activation',
      read_only_mode: !recoveryMode?.is_active,
    });
  };

  return (
    <div className={cn("p-4 border rounded-lg", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            System Recovery Mode
          </h4>
          <p className="text-sm text-muted-foreground">
            {recoveryMode?.is_active 
              ? "System is in recovery mode. Users have limited access."
              : "System is operating normally."
            }
          </p>
        </div>
        
        <Button
          variant={recoveryMode?.is_active ? "destructive" : "outline"}
          onClick={handleToggle}
          disabled={toggleRecovery.isPending}
        >
          {recoveryMode?.is_active ? "Deactivate" : "Activate"}
        </Button>
      </div>
      
      {recoveryMode?.is_active && recoveryMode.reason && (
        <Alert className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Reason: {recoveryMode.reason}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
