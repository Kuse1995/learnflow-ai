import { AlertTriangle, Info, Wrench, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePlatformAiControls } from "@/hooks/useSuperAdmin";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlags";

export function MaintenanceBanner() {
  const { data: aiControls } = usePlatformAiControls();
  const maintenanceBannerEnabled = useIsFeatureEnabled("maintenance_banner_enabled");

  // Check for AI kill switch
  if (aiControls?.kill_switch_active) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>AI features are temporarily unavailable.</strong>{" "}
          Your work is safe and all other features continue to work normally. 
          Our team is working on this.
        </AlertDescription>
      </Alert>
    );
  }

  // Check for AI globally disabled
  if (aiControls && !aiControls.ai_globally_enabled) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>AI assistance is currently paused.</strong>{" "}
          You can continue using all other platform features while we perform updates.
        </AlertDescription>
      </Alert>
    );
  }

  // Show maintenance banner if enabled via feature flag
  if (maintenanceBannerEnabled) {
    return null; // Only show if explicitly enabled
  }

  return null;
}

export function ReadOnlyBanner() {
  // This would be connected to platform_ai_controls.read_only_mode when implemented
  const isReadOnly = false; // Placeholder

  if (!isReadOnly) return null;

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-gray-100 border-gray-300">
      <Wrench className="h-4 w-4 text-gray-600" />
      <AlertDescription className="text-gray-700">
        <strong>Read-only mode is active.</strong>{" "}
        You can view your data, but changes cannot be saved right now. 
        This is temporary while we perform maintenance.
      </AlertDescription>
    </Alert>
  );
}

export function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  if (!isOffline) return null;

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-red-50 border-red-200">
      <WifiOff className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <strong>You appear to be offline.</strong>{" "}
        Some features may not work until your connection is restored. 
        Your work will be saved when you're back online.
      </AlertDescription>
    </Alert>
  );
}
