import { useOfflineMode } from "@/hooks/useOfflineMode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function OfflineIndicator() {
  const { isOnline, wasOffline, pendingUploads, syncPendingUploads, dismissOfflineNotice } = useOfflineMode();

  if (isOnline && !wasOffline && pendingUploads === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 shadow-lg flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 text-sm">You're offline</p>
            <p className="text-xs text-amber-600">Changes will sync when connected</p>
          </div>
        </div>
      )}

      {/* Back online notice */}
      {isOnline && wasOffline && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-3 shadow-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-800 text-sm">Back online!</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={dismissOfflineNotice}
            className="text-green-700 hover:text-green-800"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Pending syncs */}
      {isOnline && pendingUploads > 0 && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-lg flex items-center gap-3">
          <Badge variant="secondary" className="bg-blue-200 text-blue-800">
            {pendingUploads}
          </Badge>
          <div className="flex-1">
            <p className="font-medium text-blue-800 text-sm">
              {pendingUploads} pending sync{pendingUploads > 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              syncPendingUploads();
              toast.info('Syncing pending changes...');
            }}
            className="text-blue-700 hover:text-blue-800"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Sync
          </Button>
        </div>
      )}
    </div>
  );
}
